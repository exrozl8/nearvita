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

try:
    from mongomock_motor import AsyncMongoMockClient
    HAVE_MOCK = True
except ImportError:
    HAVE_MOCK = False

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("nearvita")

# ---------- DB Initialization ----------
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "nearvita")
USE_MOCK_DB = os.environ.get("USE_MOCK_DB", "").lower() in ("true", "1")
IS_ATLAS = mongo_url.startswith("mongodb+srv://")


def _redact_mongo_url(url: str) -> str:
    """Hide password in logs: mongodb+srv://user:***@host/..."""
    if "@" not in url or "://" not in url:
        return url
    scheme, rest = url.split("://", 1)
    creds, host = rest.split("@", 1)
    user = creds.split(":", 1)[0] if ":" in creds else creds
    return f"{scheme}://{user}:***@{host}"


# Prefer a real client up front. Mock is only used when explicitly requested.
if USE_MOCK_DB and HAVE_MOCK:
    client = AsyncMongoMockClient()
    db = client[db_name]
    db_mode = "Embedded In-Memory Engine"
else:
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=15000)
    db = client[db_name]
    db_mode = "MongoDB Connection"

# ---------- App ----------
app = FastAPI(title="NearVita — Near-Expiry Medicine Donor & Affordable Access Network")
api = APIRouter(prefix="/api")

# ---------- Auth utils ----------
JWT_ALG = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "8f9a2b4c6e1d3f5a7b9c0d2e4f6a8b1c3d5e7f9a2b4c6e1d3f5a7b9c0d2e4f6a")


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


async def require_admin(user=Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


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
    category: str = Field(min_length=1)  # Antibiotic, Pain Relief, etc.
    form: Optional[str] = ""  # Tablet, Capsule, Syrup, Injection, Inhaler
    dosage: Optional[str] = ""
    quantity: int = Field(ge=1)
    expiry_date: str  # ISO date string YYYY-MM-DD
    location: str = Field(min_length=1)
    description: Optional[str] = ""
    image_url: Optional[str] = ""
    prescription_required: bool = False
    price: float = Field(ge=0.0, default=0.0)
    original_price: Optional[float] = None
    delivery_fee: float = Field(ge=0.0, default=0.0)


class ClaimIn(BaseModel):
    medicine_id: str
    message: Optional[str] = ""
    quantity_requested: int = Field(ge=1, default=1)


class ClaimStatusIn(BaseModel):
    status: str = Field(pattern="^(accepted|rejected|completed)$")


class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class PaymentCheckoutIn(BaseModel):
    medicine_id: str
    quantity: int = Field(ge=1, default=1)
    payment_method: str = Field(default="upi")  # upi, card, cod, netbanking
    delivery_address: Optional[str] = ""
    contact_phone: Optional[str] = ""
    payer_name: Optional[str] = ""
    upi_id: Optional[str] = ""
    card_last4: Optional[str] = ""
    notes: Optional[str] = ""


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


# ---------- Medicine Serialization & Routes ----------
def serialize_medicine(m: dict, donor: Optional[dict] = None) -> dict:
    price = float(m.get("price", 0.0) or 0.0)
    orig = float(m.get("original_price", 0.0) or 0.0) if m.get("original_price") is not None else None
    delivery = float(m.get("delivery_fee", 0.0) or 0.0)
    out = {
        "id": str(m["_id"]),
        "donor_id": str(m["donor_id"]),
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
        "price": price,
        "is_free": price <= 0.0,
        "original_price": orig,
        "delivery_fee": delivery,
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
    donor_ids = list({str(d["donor_id"]) for d in docs if "donor_id" in d})
    donors = {}
    if donor_ids:
        try:
            obj_ids = [ObjectId(x) for x in donor_ids if ObjectId.is_valid(x)]
            async for d in db.users.find({"_id": {"$in": obj_ids}}):
                donors[str(d["_id"])] = d
        except Exception:
            pass

    return [serialize_medicine(m, donors.get(str(m.get("donor_id")))) for m in docs]


@api.get("/medicines/{med_id}")
async def get_medicine(med_id: str):
    try:
        m = await db.medicines.find_one({"_id": ObjectId(med_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    donor = None
    if m.get("donor_id"):
        try:
            donor = await db.users.find_one({"_id": ObjectId(m["donor_id"])})
        except Exception:
            pass
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
    try:
        m = await db.medicines.find_one({"_id": ObjectId(med_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    if str(m.get("donor_id")) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not your listing")
    await db.medicines.delete_one({"_id": ObjectId(med_id)})
    return {"ok": True}


# ---------- Claim routes ----------
async def serialize_claim(c: dict) -> dict:
    med = None
    try:
        med = await db.medicines.find_one({"_id": ObjectId(c["medicine_id"])})
    except Exception:
        pass
    receiver = None
    try:
        receiver = await db.users.find_one({"_id": ObjectId(c["receiver_id"])})
    except Exception:
        pass
    donor = None
    try:
        donor = await db.users.find_one({"_id": ObjectId(c["donor_id"])})
    except Exception:
        pass

    return {
        "id": str(c["_id"]),
        "medicine_id": str(c["medicine_id"]),
        "medicine": serialize_medicine(med) if med else None,
        "donor_id": str(c["donor_id"]),
        "receiver_id": str(c["receiver_id"]),
        "receiver": {"name": receiver.get("name"), "organization": receiver.get("organization"), "location": receiver.get("location")} if receiver else None,
        "donor": {"name": donor.get("name"), "organization": donor.get("organization"), "location": donor.get("location")} if donor else None,
        "message": c.get("message", ""),
        "quantity_requested": c.get("quantity_requested", 1),
        "status": c.get("status", "pending"),
        "payment_id": c.get("payment_id"),
        "transaction_id": c.get("transaction_id"),
        "payment_method": c.get("payment_method"),
        "amount_paid": c.get("amount_paid"),
        "created_at": c["created_at"].isoformat() if isinstance(c.get("created_at"), datetime) else c.get("created_at"),
    }


@api.post("/claims")
async def create_claim(payload: ClaimIn, user=Depends(get_current_user)):
    if user.get("role") != "receiver":
        raise HTTPException(status_code=403, detail="Only receivers can request medicines")
    try:
        med = await db.medicines.find_one({"_id": ObjectId(payload.medicine_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid medicine id")
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
        "donor_id": str(med["donor_id"]),
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
    try:
        c = await db.claims.find_one({"_id": ObjectId(claim_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid claim id")
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    if str(c["donor_id"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not your claim to update")
    await db.claims.update_one({"_id": ObjectId(claim_id)}, {"$set": {"status": payload.status}})
    if payload.status == "accepted":
        await db.medicines.update_one({"_id": ObjectId(c["medicine_id"])}, {"$set": {"status": "reserved"}})
    elif payload.status == "completed":
        await db.medicines.update_one({"_id": ObjectId(c["medicine_id"])}, {"$set": {"status": "delivered"}})
    elif payload.status == "rejected":
        await db.medicines.update_one({"_id": ObjectId(c["medicine_id"]), "status": "reserved"}, {"$set": {"status": "available"}})
    c = await db.claims.find_one({"_id": ObjectId(claim_id)})
    return await serialize_claim(c)


# ---------- Messages inside a claim thread ----------
@api.get("/claims/{claim_id}/messages")
async def get_messages(claim_id: str, user=Depends(get_current_user)):
    try:
        c = await db.claims.find_one({"_id": ObjectId(claim_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid claim id")
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    uid = str(user["_id"])
    if uid not in (str(c["donor_id"]), str(c["receiver_id"])):
        raise HTTPException(status_code=403, detail="Forbidden")
    msgs = await db.messages.find({"claim_id": claim_id}).sort("created_at", 1).to_list(1000)
    return [{
        "id": str(m["_id"]),
        "claim_id": m["claim_id"],
        "sender_id": str(m["sender_id"]),
        "sender_name": m.get("sender_name", ""),
        "text": m["text"],
        "created_at": m["created_at"].isoformat() if isinstance(m.get("created_at"), datetime) else m.get("created_at"),
    } for m in msgs]


@api.post("/claims/{claim_id}/messages")
async def post_message(claim_id: str, payload: MessageIn, user=Depends(get_current_user)):
    try:
        c = await db.claims.find_one({"_id": ObjectId(claim_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid claim id")
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    uid = str(user["_id"])
    if uid not in (str(c["donor_id"]), str(c["receiver_id"])):
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


# ---------- Payment Routes & Checkout Gateway ----------
def serialize_payment(p: dict) -> dict:
    return {
        "id": str(p["_id"]),
        "transaction_id": p.get("transaction_id", ""),
        "medicine_id": str(p.get("medicine_id", "")),
        "medicine_name": p.get("medicine_name", ""),
        "unit_price": p.get("unit_price", 0.0),
        "quantity": p.get("quantity", 1),
        "delivery_fee": p.get("delivery_fee", 0.0),
        "amount": p.get("amount", 0.0),
        "currency": p.get("currency", "INR"),
        "method": p.get("method", "upi"),
        "status": p.get("status", "succeeded"),
        "payer_id": str(p.get("payer_id", "")),
        "payer_name": p.get("payer_name", ""),
        "delivery_address": p.get("delivery_address", ""),
        "contact_phone": p.get("contact_phone", ""),
        "card_last4": p.get("card_last4", ""),
        "upi_id": p.get("upi_id", ""),
        "claim_id": str(p.get("claim_id", "")),
        "created_at": p["created_at"].isoformat() if isinstance(p.get("created_at"), datetime) else p.get("created_at"),
    }


@api.post("/payments/checkout")
async def checkout_payment(payload: PaymentCheckoutIn, user=Depends(get_current_user)):
    try:
        med = await db.medicines.find_one({"_id": ObjectId(payload.medicine_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid medicine id")
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    if med.get("status") != "available":
        raise HTTPException(status_code=400, detail="Medicine is no longer available for checkout")
    
    qty = max(1, payload.quantity)
    unit_price = float(med.get("price", 0.0) or 0.0)
    delivery = float(med.get("delivery_fee", 0.0) or 0.0)
    total_amount = round((unit_price * qty) + delivery, 2)

    # Generate a realistic transaction receipt ID
    date_code = datetime.now(timezone.utc).strftime("%Y%m%d")
    rand_hex = secrets.token_hex(3).upper()
    method_prefix = payload.payment_method[:3].upper()
    transaction_id = f"NV-PAY-{date_code}-{method_prefix}-{rand_hex}"

    status = "succeeded" if payload.payment_method != "cod" else "confirmed_cod"

    pay_doc = {
        "transaction_id": transaction_id,
        "medicine_id": str(med["_id"]),
        "medicine_name": med["name"],
        "unit_price": unit_price,
        "quantity": qty,
        "delivery_fee": delivery,
        "amount": total_amount,
        "currency": "INR",
        "method": payload.payment_method,
        "status": status,
        "payer_id": str(user["_id"]),
        "payer_name": payload.payer_name or user.get("name", "Customer"),
        "delivery_address": payload.delivery_address or user.get("location", ""),
        "contact_phone": payload.contact_phone or user.get("phone", ""),
        "card_last4": payload.card_last4 or ("4242" if payload.payment_method == "card" else ""),
        "upi_id": payload.upi_id or (f"{user.get('name','user').lower().replace(' ','')}@okaxis" if payload.payment_method == "upi" else ""),
        "notes": payload.notes or "",
        "created_at": datetime.now(timezone.utc),
    }

    res_pay = await db.payments.insert_one(pay_doc)
    pay_doc["_id"] = res_pay.inserted_id

    # Create associated Claim (automatically accepted since payment is secured)
    claim_doc = {
        "medicine_id": str(med["_id"]),
        "donor_id": str(med["donor_id"]),
        "receiver_id": str(user["_id"]),
        "message": f"Paid Order ({payload.payment_method.upper()}) · Transaction ID: {transaction_id}. Delivery to: {pay_doc['delivery_address']}",
        "quantity_requested": qty,
        "status": "accepted",
        "payment_id": str(res_pay.inserted_id),
        "transaction_id": transaction_id,
        "payment_method": payload.payment_method,
        "amount_paid": total_amount,
        "created_at": datetime.now(timezone.utc),
    }
    res_claim = await db.claims.insert_one(claim_doc)
    claim_id = str(res_claim.inserted_id)

    # Link claim_id to payment
    await db.payments.update_one({"_id": res_pay.inserted_id}, {"$set": {"claim_id": claim_id}})
    pay_doc["claim_id"] = claim_id

    # Reserve the medicine
    await db.medicines.update_one({"_id": med["_id"]}, {"$set": {"status": "reserved"}})

    # Post automated confirmation message into the claim thread
    sys_msg = {
        "claim_id": claim_id,
        "sender_id": "system",
        "sender_name": "NearVita Payment Gateway",
        "text": f"✅ Payment of ₹{total_amount:.2f} successfully verified via {payload.payment_method.upper()}! Order Ref: {transaction_id}. Donor will prepare handover.",
        "created_at": datetime.now(timezone.utc),
    }
    await db.messages.insert_one(sys_msg)

    return {
        "ok": True,
        "payment": serialize_payment(pay_doc),
        "claim_id": claim_id,
        "message": "Payment verified and order reserved successfully",
    }


@api.get("/payments/history")
async def payment_history(user=Depends(get_current_user)):
    uid = str(user["_id"])
    docs = await db.payments.find({"payer_id": uid}).sort("created_at", -1).to_list(100)
    return [serialize_payment(p) for p in docs]


@api.get("/payments/{txn_id}")
async def get_payment_receipt(txn_id: str):
    p = await db.payments.find_one({"transaction_id": txn_id})
    if not p:
        try:
            p = await db.payments.find_one({"_id": ObjectId(txn_id)})
        except Exception:
            pass
    if not p:
        raise HTTPException(status_code=404, detail="Payment receipt not found")
    return serialize_payment(p)


# ---------- Stats & Architecture System Status ----------
@api.get("/stats")
async def stats():
    total_meds = await db.medicines.count_documents({"status": "available"})
    total_donors = await db.users.count_documents({"role": "donor"})
    total_receivers = await db.users.count_documents({"role": "receiver"})
    total_delivered = await db.claims.count_documents({"status": "completed"})
    total_payments = await db.payments.count_documents({})
    return {
        "available_medicines": total_meds,
        "donors": total_donors,
        "receivers": total_receivers,
        "delivered": total_delivered,
        "payments_processed": total_payments,
    }


@api.get("/system/status")
async def system_status(user=Depends(require_admin)):
    med_count = await db.medicines.count_documents({})
    user_count = await db.users.count_documents({})
    claim_count = await db.claims.count_documents({})
    msg_count = await db.messages.count_documents({})
    pay_count = await db.payments.count_documents({})

    return {
        "service": "NearVita Backend API",
        "status": "operational",
        "database_engine": db_mode,
        "database_name": db_name,
        "collections": {
            "users": user_count,
            "medicines": med_count,
            "claims": claim_count,
            "payments": pay_count,
            "messages": msg_count,
        },
        "endpoints": [
            {"method": "POST", "path": "/api/auth/register", "desc": "Register user (donor/receiver)"},
            {"method": "POST", "path": "/api/auth/login", "desc": "JWT Authentication"},
            {"method": "GET",  "path": "/api/medicines", "desc": "Browse catalogue with search & filters"},
            {"method": "POST", "path": "/api/medicines", "desc": "Create medicine listing with pricing"},
            {"method": "POST", "path": "/api/payments/checkout", "desc": "Secure multi-method payment gateway"},
            {"method": "GET",  "path": "/api/payments/history", "desc": "User payment records & receipts"},
            {"method": "POST", "path": "/api/claims", "desc": "Request a medicine"},
            {"method": "GET",  "path": "/api/claims/{id}/messages", "desc": "Live messaging thread"},
        ],
        "version": "2.4.0",
        "time_utc": datetime.now(timezone.utc).isoformat(),
    }


@api.get("/")
async def root():
    return {
        "service": "NearVita",
        "status": "ok",
        "database": db_mode,
        "docs_url": "/docs",
        "payment_gateway": "demo_only",
    }


app.include_router(api)

# CORS configuration
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


# ---------- Seed Comprehensive Demo Data ----------
async def seed_data():
    # 1. Admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@nearvita.health").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@1234")
    admin_user = await db.users.find_one({"email": admin_email})
    if not admin_user:
        res = await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "NearVita Admin",
            "role": "admin",
            "organization": "NearVita Central Network",
            "location": "Bengaluru, IN",
            "phone": "+91 98765 43210",
            "created_at": datetime.now(timezone.utc),
        })
        admin_id = str(res.inserted_id)
        logger.info("Seeded admin user %s", admin_email)
    else:
        admin_id = str(admin_user["_id"])
        if admin_user.get("role") != "admin":
            await db.users.update_one({"_id": admin_user["_id"]}, {"$set": {"role": "admin"}})

    # 2. Demo Donor: Apollo Health Hub
    donor_user = await db.users.find_one({"email": "donor@nearvita.health"})
    if not donor_user:
        res = await db.users.insert_one({
            "email": "donor@nearvita.health",
            "password_hash": hash_password("Donor@1234"),
            "name": "Apollo Pharmacy Network",
            "role": "donor",
            "organization": "Apollo Care & Surplus Depot",
            "location": "Indiranagar, Bengaluru",
            "phone": "+91 98450 11223",
            "created_at": datetime.now(timezone.utc),
        })
        donor_id = str(res.inserted_id)
        logger.info("Seeded demo donor: donor@nearvita.health")
    else:
        donor_id = str(donor_user["_id"])

    # 3. Demo Receiver: Care India Foundation NGO
    receiver_user = await db.users.find_one({"email": "receiver@nearvita.health"})
    if not receiver_user:
        res = await db.users.insert_one({
            "email": "receiver@nearvita.health",
            "password_hash": hash_password("Receiver@1234"),
            "name": "Care India Foundation",
            "role": "receiver",
            "organization": "Care India Free Clinic NGO",
            "location": "Koramangala, Bengaluru",
            "phone": "+91 98112 33445",
            "created_at": datetime.now(timezone.utc),
        })
        receiver_id = str(res.inserted_id)
        logger.info("Seeded demo receiver: receiver@nearvita.health")
    else:
        receiver_id = str(receiver_user["_id"])

    # 4. Seed High-Quality Realistic Medicines if empty
    med_count = await db.medicines.count_documents({})
    if med_count == 0:
        today = datetime.now(timezone.utc).date()
        sample_medicines = [
            {
                "donor_id": donor_id,
                "name": "Augmentin 625 Duo",
                "brand": "GlaxoSmithKline (GSK)",
                "category": "Antibiotic",
                "form": "Tablet",
                "dosage": "Amoxicillin 500mg + Clavulanic Acid 125mg",
                "quantity": 24,
                "price": 65.0,
                "original_price": 225.0,
                "delivery_fee": 30.0,
                "expiry_date": (today + timedelta(days=45)).isoformat(),
                "location": "Indiranagar, Bengaluru",
                "description": "Sealed original strip packs stored in climate-controlled pharmacy depot. High efficacy broad spectrum antibiotic.",
                "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
                "prescription_required": True,
                "status": "available",
                "created_at": datetime.now(timezone.utc),
            },
            {
                "donor_id": donor_id,
                "name": "Glycomet-GP 2 Forte",
                "brand": "USV Pvt Ltd",
                "category": "Diabetes",
                "form": "Tablet",
                "dosage": "Metformin 1000mg + Glimepiride 2mg",
                "quantity": 50,
                "price": 0.0,  # 100% Free Donation!
                "original_price": 180.0,
                "delivery_fee": 0.0,
                "expiry_date": (today + timedelta(days=60)).isoformat(),
                "location": "Jayanagar, Bengaluru",
                "description": "Essential anti-diabetic maintenance therapy. Offered completely free to NGOs or low-income patients in need.",
                "image_url": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80",
                "prescription_required": True,
                "status": "available",
                "created_at": datetime.now(timezone.utc),
            },
            {
                "donor_id": donor_id,
                "name": "Azithral 500 Tablets",
                "brand": "Alembic Pharmaceuticals",
                "category": "Antibiotic",
                "form": "Tablet",
                "dosage": "Azithromycin 500mg",
                "quantity": 30,
                "price": 45.0,
                "original_price": 135.0,
                "delivery_fee": 25.0,
                "expiry_date": (today + timedelta(days=28)).isoformat(),
                "location": "Whitefield, Bengaluru",
                "description": "Unopened blister strips. Used for upper and lower respiratory tract infections. Ready for quick handover.",
                "image_url": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=80",
                "prescription_required": True,
                "status": "available",
                "created_at": datetime.now(timezone.utc),
            },
            {
                "donor_id": admin_id,
                "name": "Dolo 650",
                "brand": "Micro Labs Ltd",
                "category": "Pain Relief",
                "form": "Tablet",
                "dosage": "Paracetamol 650mg",
                "quantity": 100,
                "price": 15.0,
                "original_price": 34.0,
                "delivery_fee": 15.0,
                "expiry_date": (today + timedelta(days=90)).isoformat(),
                "location": "HSR Layout, Bengaluru",
                "description": "High-demand fever and analgesic relief tablets. Surplus from community health camp batch.",
                "image_url": "https://images.unsplash.com/photo-1550572017-ed24c16a3a4c?w=600&auto=format&fit=crop&q=80",
                "prescription_required": False,
                "status": "available",
                "created_at": datetime.now(timezone.utc),
            },
            {
                "donor_id": donor_id,
                "name": "Budecort 200 Inhaler",
                "brand": "Cipla",
                "category": "Respiratory",
                "form": "Inhaler",
                "dosage": "Budesonide 200mcg (200 MDI doses)",
                "quantity": 8,
                "price": 95.0,
                "original_price": 430.0,
                "delivery_fee": 30.0,
                "expiry_date": (today + timedelta(days=40)).isoformat(),
                "location": "Indiranagar, Bengaluru",
                "description": "Original factory foil seal intact. For asthma and chronic obstructive pulmonary care.",
                "image_url": "https://images.unsplash.com/photo-1576073719676-aa955fc6b889?w=600&auto=format&fit=crop&q=80",
                "prescription_required": True,
                "status": "available",
                "created_at": datetime.now(timezone.utc),
            },
            {
                "donor_id": admin_id,
                "name": "Neurobion Forte",
                "brand": "Procter & Gamble Health",
                "category": "Vitamins",
                "form": "Tablet",
                "dosage": "Vitamin B Complex + B12",
                "quantity": 60,
                "price": 0.0,  # Free Donation
                "original_price": 42.0,
                "delivery_fee": 0.0,
                "expiry_date": (today + timedelta(days=70)).isoformat(),
                "location": "Malleshwaram, Bengaluru",
                "description": "Multivitamin neurotropic supplement to replenish essential nerve vitamins. Free for clinic dispensing.",
                "image_url": "https://images.unsplash.com/photo-1550572017-4fcdbb59cc32?w=600&auto=format&fit=crop&q=80",
                "prescription_required": False,
                "status": "available",
                "created_at": datetime.now(timezone.utc),
            },
            {
                "donor_id": donor_id,
                "name": "Betadine 10% Ointment",
                "brand": "Win-Medicare",
                "category": "Dermatology",
                "form": "Ointment",
                "dosage": "Povidone-Iodine 10% w/w (20g tube)",
                "quantity": 15,
                "price": 25.0,
                "original_price": 95.0,
                "delivery_fee": 20.0,
                "expiry_date": (today + timedelta(days=80)).isoformat(),
                "location": "Koramangala, Bengaluru",
                "description": "Antiseptic microbicidal ointment for wound care, burn prevention, and minor skin infections.",
                "image_url": "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=600&auto=format&fit=crop&q=80",
                "prescription_required": False,
                "status": "available",
                "created_at": datetime.now(timezone.utc),
            },
            {
                "donor_id": donor_id,
                "name": "Telma-H Tablets",
                "brand": "Glenmark Pharmaceuticals",
                "category": "Cardiac",
                "form": "Tablet",
                "dosage": "Telmisartan 40mg + Hydrochlorothiazide 12.5mg",
                "quantity": 28,
                "price": 75.0,
                "original_price": 270.0,
                "delivery_fee": 25.0,
                "expiry_date": (today + timedelta(days=32)).isoformat(),
                "location": "Indiranagar, Bengaluru",
                "description": "Hypertension blood pressure regulation medicine. Genuine pharmacy surplus batch.",
                "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
                "prescription_required": True,
                "status": "available",
                "created_at": datetime.now(timezone.utc),
            },
        ]
        res_meds = await db.medicines.insert_many(sample_medicines)
        logger.info("Seeded %d realistic medical listings", len(res_meds.inserted_ids))

        # 5. Create a sample paid transaction & claim for demonstration
        first_med = sample_medicines[0]
        first_med_id = str(res_meds.inserted_ids[0])
        demo_txn = f"NV-PAY-{today.strftime('%Y%m%d')}-UPI-8F4A2B"
        demo_payment = {
            "transaction_id": demo_txn,
            "medicine_id": first_med_id,
            "medicine_name": first_med["name"],
            "unit_price": first_med["price"],
            "quantity": 2,
            "delivery_fee": first_med["delivery_fee"],
            "amount": (first_med["price"] * 2) + first_med["delivery_fee"],
            "currency": "INR",
            "method": "upi",
            "status": "succeeded",
            "payer_id": receiver_id,
            "payer_name": "Care India Free Clinic",
            "delivery_address": "Care India Foundation, #42 8th Main, Koramangala 4th Block, Bengaluru",
            "contact_phone": "+91 98112 33445",
            "upi_id": "careindia@okhdfcbank",
            "card_last4": "",
            "notes": "Urgent patient requirement for outreach camp.",
            "created_at": datetime.now(timezone.utc) - timedelta(hours=2),
        }
        res_p = await db.payments.insert_one(demo_payment)
        
        demo_claim = {
            "medicine_id": first_med_id,
            "donor_id": donor_id,
            "receiver_id": receiver_id,
            "message": f"Paid Order (UPI) · Transaction ID: {demo_txn}. Deliver to Care India Clinic.",
            "quantity_requested": 2,
            "status": "accepted",
            "payment_id": str(res_p.inserted_id),
            "transaction_id": demo_txn,
            "payment_method": "upi",
            "amount_paid": demo_payment["amount"],
            "created_at": datetime.now(timezone.utc) - timedelta(hours=2),
        }
        res_c = await db.claims.insert_one(demo_claim)
        claim_id = str(res_c.inserted_id)
        await db.payments.update_one({"_id": res_p.inserted_id}, {"$set": {"claim_id": claim_id}})

        # Seed sample message thread in the claim
        await db.messages.insert_many([
            {
                "claim_id": claim_id,
                "sender_id": "system",
                "sender_name": "NearVita Payment Gateway",
                "text": f"✅ Payment of ₹{demo_payment['amount']:.2f} successfully verified via UPI! Order Ref: {demo_txn}.",
                "created_at": datetime.now(timezone.utc) - timedelta(hours=2),
            },
            {
                "claim_id": claim_id,
                "sender_id": receiver_id,
                "sender_name": "Care India Foundation",
                "text": "Hello Apollo Pharmacy! We have processed the payment for 2 strips of Augmentin 625 for our free clinic camp.",
                "created_at": datetime.now(timezone.utc) - timedelta(hours=1, minutes=45),
            },
            {
                "claim_id": claim_id,
                "sender_id": donor_id,
                "sender_name": "Apollo Pharmacy Network",
                "text": "Thank you! We have verified the prescription and packed the medicine with temperature control. Courier pickup scheduled today by 4 PM.",
                "created_at": datetime.now(timezone.utc) - timedelta(hours=1, minutes=20),
            },
        ])
        logger.info("Seeded demo transaction, claim, and message thread.")


@app.on_event("startup")
async def startup():
    global client, db, db_mode
    # Atlas / any real URI: connect for real. Do not silently swap in mongomock
    # (that hid all writes from Atlas). Mock only if USE_MOCK_DB=true.
    if not USE_MOCK_DB:
        timeout_ms = 15000 if IS_ATLAS else 5000
        try:
            real_client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=timeout_ms)
            await real_client.admin.command("ping")
            client = real_client
            db = client[db_name]
            db_mode = f"Connected to MongoDB ({_redact_mongo_url(mongo_url)})"
            logger.info("Successfully connected to live MongoDB (%s)", _redact_mongo_url(mongo_url))
        except Exception as e:
            if IS_ATLAS or not HAVE_MOCK:
                logger.exception(
                    "Could not reach MongoDB at %s. Check Atlas user password and Network Access (IP allowlist).",
                    _redact_mongo_url(mongo_url),
                )
                raise RuntimeError(
                    f"MongoDB connection failed ({_redact_mongo_url(mongo_url)}): {e}"
                ) from e
            logger.warning(
                "Local MongoDB not detected on %s (%s). Using embedded database.",
                _redact_mongo_url(mongo_url),
                e,
            )
            client = AsyncMongoMockClient()
            db = client[db_name]
            db_mode = "Embedded In-Memory Engine (Auto Fallback)"

    try:
        await db.users.create_index("email", unique=True)
        await db.medicines.create_index("expiry_date")
        await db.medicines.create_index("donor_id")
        await db.claims.create_index([("donor_id", 1), ("receiver_id", 1)])
        await db.messages.create_index("claim_id")
        await db.payments.create_index("transaction_id", unique=True)
    except Exception as e:
        logger.debug("Index creation: %s", e)

    await seed_data()


@app.on_event("shutdown")
async def shutdown():
    try:
        client.close()
    except Exception:
        pass
