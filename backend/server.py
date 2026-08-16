from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ---------- DB ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="NearVita — Near-Expiry Medicine Donor Network")
api = APIRouter(prefix="/api")

# ---------- Auth utils ----------
JWT_ALG = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def set_auth_cookies(resp: Response, access: str, refresh: str):
    resp.set_cookie("access_token", access, httponly=True, secure=True,
                    samesite="none", max_age=60 * 60 * 12, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                    samesite="none", max_age=60 * 60 * 24 * 7, path="/")


def clear_auth_cookies(resp: Response):
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")


def serialize_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role", "receiver"),
        "organization": u.get("organization", ""),
        "location": u.get("location", ""),
        "phone": u.get("phone", ""),
        "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=120)
    role: str = Field(pattern="^(donor|receiver)$")
    organization: Optional[str] = ""
    location: Optional[str] = ""
    phone: Optional[str] = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class MedicineIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    brand: Optional[str] = ""
    category: str = Field(min_length=1)  # e.g. Antibiotic, Pain relief
    form: Optional[str] = ""  # tablet, syrup, injection
    dosage: Optional[str] = ""
    quantity: int = Field(ge=1)
    expiry_date: str  # ISO date
    location: str = Field(min_length=1)
    description: Optional[str] = ""
    image_url: Optional[str] = ""
    prescription_required: bool = False


class ClaimIn(BaseModel):
    medicine_id: str
    message: Optional[str] = ""
    quantity_requested: int = Field(ge=1, default=1)


class ClaimStatusIn(BaseModel):
    status: str = Field(pattern="^(accepted|rejected|completed)$")


class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


# ---------- Auth routes ----------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    exists = await db.users.find_one({"email": email})
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name.strip(),
        "role": payload.role,
        "organization": (payload.organization or "").strip(),
        "location": (payload.location or "").strip(),
        "phone": (payload.phone or "").strip(),
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    access = create_access_token(str(res.inserted_id), email)
    refresh = create_refresh_token(str(res.inserted_id))
    set_auth_cookies(response, access, refresh)
    return {"user": serialize_user(doc), "token": access}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_access_token(str(user["_id"]), email)
    refresh = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access, refresh)
    return {"user": serialize_user(user), "token": access}


@api.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return serialize_user(user)


# ---------- Medicine routes ----------
def serialize_medicine(m: dict, donor: Optional[dict] = None) -> dict:
    out = {
        "id": str(m["_id"]),
        "donor_id": m["donor_id"],
        "name": m["name"],
        "brand": m.get("brand", ""),
        "category": m["category"],
        "form": m.get("form", ""),
        "dosage": m.get("dosage", ""),
        "quantity": m["quantity"],
        "expiry_date": m["expiry_date"],
        "location": m["location"],
        "description": m.get("description", ""),
        "image_url": m.get("image_url", ""),
        "prescription_required": m.get("prescription_required", False),
        "status": m.get("status", "available"),
        "created_at": m["created_at"].isoformat() if isinstance(m.get("created_at"), datetime) else m.get("created_at"),
    }
    if donor:
        out["donor"] = {
            "name": donor.get("name", ""),
            "organization": donor.get("organization", ""),
            "location": donor.get("location", ""),
        }
    return out


@api.get("/medicines")
async def list_medicines(
    q: Optional[str] = None,
    category: Optional[str] = None,
    location: Optional[str] = None,
    status: Optional[str] = "available",
    days_to_expiry: Optional[int] = None,
    mine: Optional[bool] = False,
    request: Request = None,
):
    filt: dict = {}
    if status and status != "all":
        filt["status"] = status
    if category:
        filt["category"] = category
    if location:
        filt["location"] = {"$regex": location, "$options": "i"}
    if q:
        filt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    if days_to_expiry:
        cutoff = (datetime.now(timezone.utc) + timedelta(days=days_to_expiry)).date().isoformat()
        filt["expiry_date"] = {"$lte": cutoff}

    if mine:
        try:
            u = await get_current_user(request)
            filt["donor_id"] = str(u["_id"])
        except HTTPException:
            raise
    docs = await db.medicines.find(filt).sort("expiry_date", 1).to_list(500)
    donor_ids = list({d["donor_id"] for d in docs})
    donors = {}
    if donor_ids:
        obj_ids = [ObjectId(x) for x in donor_ids]
        async for d in db.users.find({"_id": {"$in": obj_ids}}):
            donors[str(d["_id"])] = d
    return [serialize_medicine(m, donors.get(m["donor_id"])) for m in docs]


@api.get("/medicines/{med_id}")
async def get_medicine(med_id: str):
    try:
        m = await db.medicines.find_one({"_id": ObjectId(med_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    donor = await db.users.find_one({"_id": ObjectId(m["donor_id"])})
    return serialize_medicine(m, donor)


@api.post("/medicines")
async def create_medicine(payload: MedicineIn, user=Depends(get_current_user)):
    if user.get("role") != "donor":
        raise HTTPException(status_code=403, detail="Only donors can create listings")
    doc = payload.model_dump()
    doc["donor_id"] = str(user["_id"])
    doc["status"] = "available"
    doc["created_at"] = datetime.now(timezone.utc)
    res = await db.medicines.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_medicine(doc, user)


@api.delete("/medicines/{med_id}")
async def delete_medicine(med_id: str, user=Depends(get_current_user)):
    m = await db.medicines.find_one({"_id": ObjectId(med_id)})
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    if m["donor_id"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not your listing")
    await db.medicines.delete_one({"_id": ObjectId(med_id)})
    return {"ok": True}


# ---------- Claim routes ----------
async def serialize_claim(c: dict) -> dict:
    med = await db.medicines.find_one({"_id": ObjectId(c["medicine_id"])})
    receiver = await db.users.find_one({"_id": ObjectId(c["receiver_id"])})
    donor = await db.users.find_one({"_id": ObjectId(c["donor_id"])})
    return {
        "id": str(c["_id"]),
        "medicine_id": c["medicine_id"],
        "medicine": serialize_medicine(med) if med else None,
        "donor_id": c["donor_id"],
        "receiver_id": c["receiver_id"],
        "receiver": {"name": receiver.get("name"), "organization": receiver.get("organization"), "location": receiver.get("location")} if receiver else None,
        "donor": {"name": donor.get("name"), "organization": donor.get("organization"), "location": donor.get("location")} if donor else None,
        "message": c.get("message", ""),
        "quantity_requested": c.get("quantity_requested", 1),
        "status": c.get("status", "pending"),
        "created_at": c["created_at"].isoformat() if isinstance(c.get("created_at"), datetime) else c.get("created_at"),
    }


@api.post("/claims")
async def create_claim(payload: ClaimIn, user=Depends(get_current_user)):
    if user.get("role") != "receiver":
        raise HTTPException(status_code=403, detail="Only receivers can request medicines")
    med = await db.medicines.find_one({"_id": ObjectId(payload.medicine_id)})
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    if med.get("status") != "available":
        raise HTTPException(status_code=400, detail="Medicine no longer available")
    existing = await db.claims.find_one({
        "medicine_id": payload.medicine_id,
        "receiver_id": str(user["_id"]),
        "status": {"$in": ["pending", "accepted"]},
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active request for this item")
    doc = {
        "medicine_id": payload.medicine_id,
        "donor_id": med["donor_id"],
        "receiver_id": str(user["_id"]),
        "message": payload.message or "",
        "quantity_requested": payload.quantity_requested,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.claims.insert_one(doc)
    doc["_id"] = res.inserted_id
    return await serialize_claim(doc)


@api.get("/claims")
async def list_claims(role: Optional[str] = None, user=Depends(get_current_user)):
    uid = str(user["_id"])
    if role == "donor":
        filt = {"donor_id": uid}
    elif role == "receiver":
        filt = {"receiver_id": uid}
    else:
        filt = {"$or": [{"donor_id": uid}, {"receiver_id": uid}]}
    docs = await db.claims.find(filt).sort("created_at", -1).to_list(500)
    return [await serialize_claim(d) for d in docs]


@api.patch("/claims/{claim_id}")
async def update_claim(claim_id: str, payload: ClaimStatusIn, user=Depends(get_current_user)):
    c = await db.claims.find_one({"_id": ObjectId(claim_id)})
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    if c["donor_id"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not your claim to update")
    await db.claims.update_one({"_id": ObjectId(claim_id)}, {"$set": {"status": payload.status}})
    if payload.status == "accepted":
        await db.medicines.update_one({"_id": ObjectId(c["medicine_id"])}, {"$set": {"status": "reserved"}})
    elif payload.status == "completed":
        await db.medicines.update_one({"_id": ObjectId(c["medicine_id"])}, {"$set": {"status": "delivered"}})
    elif payload.status == "rejected":
        # revert medicine back to available if it was reserved by this claim
        await db.medicines.update_one({"_id": ObjectId(c["medicine_id"]), "status": "reserved"}, {"$set": {"status": "available"}})
    c = await db.claims.find_one({"_id": ObjectId(claim_id)})
    return await serialize_claim(c)


# ---------- Messages inside a claim thread ----------
@api.get("/claims/{claim_id}/messages")
async def get_messages(claim_id: str, user=Depends(get_current_user)):
    c = await db.claims.find_one({"_id": ObjectId(claim_id)})
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    uid = str(user["_id"])
    if uid not in (c["donor_id"], c["receiver_id"]):
        raise HTTPException(status_code=403, detail="Forbidden")
    msgs = await db.messages.find({"claim_id": claim_id}).sort("created_at", 1).to_list(1000)
    return [{
        "id": str(m["_id"]),
        "claim_id": m["claim_id"],
        "sender_id": m["sender_id"],
        "sender_name": m.get("sender_name", ""),
        "text": m["text"],
        "created_at": m["created_at"].isoformat() if isinstance(m.get("created_at"), datetime) else m.get("created_at"),
    } for m in msgs]


@api.post("/claims/{claim_id}/messages")
async def post_message(claim_id: str, payload: MessageIn, user=Depends(get_current_user)):
    c = await db.claims.find_one({"_id": ObjectId(claim_id)})
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    uid = str(user["_id"])
    if uid not in (c["donor_id"], c["receiver_id"]):
        raise HTTPException(status_code=403, detail="Forbidden")
    doc = {
        "claim_id": claim_id,
        "sender_id": uid,
        "sender_name": user.get("name", ""),
        "text": payload.text.strip(),
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.messages.insert_one(doc)
    doc["_id"] = res.inserted_id
    return {
        "id": str(doc["_id"]),
        "claim_id": claim_id,
        "sender_id": uid,
        "sender_name": doc["sender_name"],
        "text": doc["text"],
        "created_at": doc["created_at"].isoformat(),
    }


# ---------- Stats ----------
@api.get("/stats")
async def stats():
    total_meds = await db.medicines.count_documents({"status": "available"})
    total_donors = await db.users.count_documents({"role": "donor"})
    total_receivers = await db.users.count_documents({"role": "receiver"})
    total_delivered = await db.claims.count_documents({"status": "completed"})
    return {
        "available_medicines": total_meds,
        "donors": total_donors,
        "receivers": total_receivers,
        "delivered": total_delivered,
    }


@api.get("/")
async def root():
    return {"service": "NearVita", "status": "ok"}


app.include_router(api)

# CORS
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
if not origins:
    origins = [os.environ.get("FRONTEND_URL", "http://localhost:3000")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("nearvita")


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@nearvita.health").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@1234")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "NearVita Admin",
            "role": "donor",
            "organization": "NearVita Central",
            "location": "Bengaluru, IN",
            "phone": "",
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Seeded admin user %s", admin_email)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.medicines.create_index("expiry_date")
    await db.medicines.create_index("donor_id")
    await db.claims.create_index([("donor_id", 1), ("receiver_id", 1)])
    await db.messages.create_index("claim_id")
    await seed_admin()


@app.on_event("shutdown")
async def shutdown():
    client.close()
