from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict

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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("nearvita")

# ---------- Strict JWT Secret Validation (Fail-Closed) ----------
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET or not JWT_SECRET.strip():
    raise RuntimeError(
        "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable is missing. "
        "The server refuses to start insecurely without an explicitly configured JWT_SECRET."
    )

JWT_ALG = "HS256"

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


# Prefer real MongoDB client up front
if USE_MOCK_DB and HAVE_MOCK:
    client = AsyncMongoMockClient()
    db = client[db_name]
    db_mode = "Embedded In-Memory Engine"
else:
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=15000)
    db = client[db_name]
    db_mode = "MongoDB Connection"

# ---------- App & Router ----------
app = FastAPI(
    title="NearVita — Surplus Medicine Redistribution Network",
    description="A non-profit, zero-resale platform connecting unexpired medicine donors with verified healthcare receivers."
)
api = APIRouter(prefix="/api")

# ---------- Rate Limiting for Auth ----------
LOGIN_ATTEMPTS: Dict[str, List[float]] = {}


def check_rate_limit(key: str, max_attempts: int = 5, window_seconds: int = 300) -> bool:
    now = datetime.now(timezone.utc).timestamp()
    attempts = [t for t in LOGIN_ATTEMPTS.get(key, []) if now - t < window_seconds]
    LOGIN_ATTEMPTS[key] = attempts
    return len(attempts) < max_attempts


def record_failed_attempt(key: str):
    now = datetime.now(timezone.utc).timestamp()
    if key not in LOGIN_ATTEMPTS:
        LOGIN_ATTEMPTS[key] = []
    LOGIN_ATTEMPTS[key].append(now)


def clear_rate_limit(key: str):
    LOGIN_ATTEMPTS.pop(key, None)


# ---------- Password & Token Helpers ----------
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


COOKIE_SECURE = os.environ.get("FRONTEND_URL", "http://localhost:3000").startswith("https")
COOKIE_SAMESITE = "none" if COOKIE_SECURE else "lax"


def set_auth_cookies(resp: Response, access: str, refresh: str):
    resp.set_cookie("access_token", access, httponly=True, secure=COOKIE_SECURE,
                    samesite=COOKIE_SAMESITE, max_age=60 * 60 * 12, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=COOKIE_SECURE,
                    samesite=COOKIE_SAMESITE, max_age=60 * 60 * 24 * 7, path="/")


def clear_auth_cookies(resp: Response):
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")


def serialize_user(u: dict) -> dict:
    role = u.get("role", "receiver")
    # Donors and admins are approved by default; receivers require verification
    is_approved = u.get("is_approved", True if role != "receiver" else False)
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u.get("name", ""),
        "role": role,
        "organization": u.get("organization", ""),
        "location": u.get("location", ""),
        "phone": u.get("phone", ""),
        "verification_details": u.get("verification_details", ""),
        "is_approved": is_approved,
        "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    # First check Authorization: Bearer <token> (resilient against cross-site Safari cookie blocking)
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    
    # Fallback to cookies
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")


async def require_admin(user=Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user


# ---------- Pydantic Schemas ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Password must be at least 8 characters")
    name: str = Field(min_length=1, max_length=120)
    role: str = Field(pattern="^(donor|receiver)$")
    organization: Optional[str] = ""
    location: Optional[str] = ""
    phone: Optional[str] = ""
    verification_details: Optional[str] = Field(
        default="",
        description="NGO 12A/80G Reg Number, Clinic License, or Pharmacist Registration details"
    )


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class MedicineIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    brand: Optional[str] = ""
    category: str = Field(min_length=1)
    form: Optional[str] = ""
    dosage: Optional[str] = ""
    quantity: int = Field(ge=1)
    expiry_date: str  # YYYY-MM-DD
    location: str = Field(min_length=1)
    description: Optional[str] = ""
    image_url: Optional[str] = ""
    prescription_required: bool = False
    batch_number: Optional[str] = ""
    storage_condition: Optional[str] = ""


class ClaimIn(BaseModel):
    medicine_id: str
    message: Optional[str] = ""
    quantity_requested: int = Field(ge=1, default=1)
    prescription_doctor: Optional[str] = ""
    prescription_rx_number: Optional[str] = ""
    prescription_certified: Optional[bool] = False


class ClaimStatusIn(BaseModel):
    status: str = Field(pattern="^(accepted|rejected|completed)$")


class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class ReceiverStatusIn(BaseModel):
    is_approved: bool


# ---------- Auth Routes ----------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    exists = await db.users.find_one({"email": email})
    if exists:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    # Receivers require administrative verification before claiming medicines
    is_approved = True if payload.role == "donor" else False

    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name.strip(),
        "role": payload.role,
        "organization": (payload.organization or "").strip(),
        "location": (payload.location or "").strip(),
        "phone": (payload.phone or "").strip(),
        "verification_details": (payload.verification_details or "").strip(),
        "is_approved": is_approved,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id

    access = create_access_token(str(res.inserted_id), email)
    refresh = create_refresh_token(str(res.inserted_id))
    set_auth_cookies(response, access, refresh)
    return {"user": serialize_user(doc), "token": access}


@api.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    client_ip = request.client.host if request.client else "local"
    email = payload.email.lower().strip()
    rate_key = f"{client_ip}:{email}"

    if not check_rate_limit(rate_key):
        raise HTTPException(
            status_code=429,
            detail="Too many failed login attempts. Please wait 5 minutes before trying again."
        )

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        record_failed_attempt(rate_key)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    clear_rate_limit(rate_key)
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


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user:
        reset_token = secrets.token_urlsafe(32)
        exp = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.password_resets.update_one(
            {"user_id": str(user["_id"])},
            {"$set": {"token": reset_token, "email": email, "expires_at": exp}},
            upsert=True
        )
        logger.info("Password reset initiated for %s: token=%s", email, reset_token)
    return {
        "ok": True,
        "message": "If that email is registered, password reset instructions have been prepared."
    }


@api.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn):
    record = await db.password_resets.find_one({"token": payload.token})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token")
    
    expires_at = record.get("expires_at")
    if isinstance(expires_at, datetime) and expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        await db.password_resets.delete_one({"_id": record["_id"]})
        raise HTTPException(status_code=400, detail="Password reset token has expired")

    user_id = record["user_id"]
    new_hash = hash_password(payload.new_password)
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"password_hash": new_hash}})
    await db.password_resets.delete_one({"_id": record["_id"]})
    return {"ok": True, "message": "Password successfully updated. You can now sign in."}


# ---------- Medicine Categories & Default Images ----------
CATEGORY_IMAGES = {
    "Antibiotic": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80",
    "Analgesic": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
    "Pain Relief": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
    "Diabetes": "https://images.unsplash.com/photo-1550572017-4fcdbb59cc32?w=600&auto=format&fit=crop&q=80",
    "Supplements": "https://images.unsplash.com/photo-1550572017-4fcdbb59cc32?w=600&auto=format&fit=crop&q=80",
    "Dermatology": "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=600&auto=format&fit=crop&q=80",
    "Cardiac": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
    "Respiratory": "https://images.unsplash.com/photo-1576073719676-aa955fc6b889?w=600&auto=format&fit=crop&q=80",
    "Vitamins": "https://images.unsplash.com/photo-1550572017-4fcdbb59cc32?w=600&auto=format&fit=crop&q=80",
}
DEFAULT_MEDICINE_IMAGE = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80"


def serialize_medicine(m: dict, donor: Optional[dict] = None) -> dict:
    img = m.get("image_url") or m.get("image") or ""
    if not img or not str(img).strip():
        cat = m.get("category", "")
        img = CATEGORY_IMAGES.get(cat, DEFAULT_MEDICINE_IMAGE)

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
        "location": m.get("location") or "India",
        "description": m.get("description", ""),
        "image_url": img,
        "prescription_required": m.get("prescription_required", False),
        "batch_number": m.get("batch_number", ""),
        "storage_condition": m.get("storage_condition", "Store below 25°C in dry place"),
        "status": m.get("status", "available"),
        # Pure Donation Model: zero resale, no cash
        "price": 0.0,
        "is_free": True,
        "delivery_fee": 0.0,
        "created_at": m["created_at"].isoformat() if isinstance(m.get("created_at"), datetime) else m.get("created_at"),
    }
    if donor:
        out["donor"] = {
            "name": donor.get("name", ""),
            "organization": donor.get("organization", ""),
            "location": donor.get("location", ""),
        }
    return out


# ---------- Medicine Endpoints ----------
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
    if category and category != "All":
        filt["category"] = category
    
    # Safe regex queries with re.escape
    if location and location.strip():
        filt["location"] = {"$regex": re.escape(location.strip()), "$options": "i"}
    if q and q.strip():
        safe_q = re.escape(q.strip())
        filt["$or"] = [
            {"name": {"$regex": safe_q, "$options": "i"}},
            {"brand": {"$regex": safe_q, "$options": "i"}},
            {"description": {"$regex": safe_q, "$options": "i"}},
        ]
    if days_to_expiry:
        cutoff = (datetime.now(timezone.utc) + timedelta(days=days_to_expiry)).date().isoformat()
        filt["expiry_date"] = {"$lte": cutoff}

    if mine:
        u = await get_current_user(request)
        filt["donor_id"] = str(u["_id"])

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
        raise HTTPException(status_code=400, detail="Invalid medicine ID")
    if not m:
        raise HTTPException(status_code=404, detail="Medicine not found")
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
        raise HTTPException(status_code=403, detail="Only donors can create medicine donation listings")

    # Safety Validation: Expiry Date & Shelf Life Verification
    try:
        exp_date = datetime.strptime(payload.expiry_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid expiry date format. Expected YYYY-MM-DD.")

    today = datetime.now(timezone.utc).date()
    if exp_date <= today:
        raise HTTPException(
            status_code=400,
            detail="Safety Violation: Expired medicines cannot be listed or donated under national drug regulations."
        )

    min_shelf_life_date = today + timedelta(days=30)
    if exp_date < min_shelf_life_date:
        days_left = (exp_date - today).days
        raise HTTPException(
            status_code=400,
            detail=f"Safety Violation: Medicine has only {days_left} days remaining. NearVita safety policy requires a minimum shelf life of at least 30 days to ensure safe patient dispensing."
        )

    doc = payload.model_dump()
    doc["donor_id"] = str(user["_id"])
    doc["status"] = "available"
    # Pure donation model
    doc["price"] = 0.0
    doc["is_free"] = True
    doc["delivery_fee"] = 0.0
    doc["created_at"] = datetime.now(timezone.utc)

    res = await db.medicines.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_medicine(doc, user)


@api.delete("/medicines/{med_id}")
async def delete_medicine(med_id: str, user=Depends(get_current_user)):
    try:
        m = await db.medicines.find_one({"_id": ObjectId(med_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid medicine ID")
    if not m:
        raise HTTPException(status_code=404, detail="Medicine listing not found")
    if str(m.get("donor_id")) != str(user["_id"]) and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You do not have permission to delete this listing")
    await db.medicines.delete_one({"_id": ObjectId(med_id)})
    return {"ok": True}


# ---------- Claim Serialization & Endpoints ----------
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
        "receiver": {
            "name": receiver.get("name"),
            "organization": receiver.get("organization"),
            "location": receiver.get("location"),
            "is_approved": receiver.get("is_approved", False),
        } if receiver else None,
        "donor": {
            "name": donor.get("name"),
            "organization": donor.get("organization"),
            "location": donor.get("location")
        } if donor else None,
        "message": c.get("message", ""),
        "quantity_requested": c.get("quantity_requested", 1),
        "prescription_doctor": c.get("prescription_doctor", ""),
        "prescription_rx_number": c.get("prescription_rx_number", ""),
        "prescription_certified": c.get("prescription_certified", False),
        "status": c.get("status", "pending"),
        "created_at": c["created_at"].isoformat() if isinstance(c.get("created_at"), datetime) else c.get("created_at"),
        "updated_at": c.get("updated_at").isoformat() if isinstance(c.get("updated_at"), datetime) else c.get("updated_at"),
    }


@api.post("/claims")
async def create_claim(payload: ClaimIn, user=Depends(get_current_user)):
    if user.get("role") != "receiver":
        raise HTTPException(status_code=403, detail="Only registered receivers can request medicines")

    # Receiver Approval Check
    if not user.get("is_approved", False):
        raise HTTPException(
            status_code=403,
            detail="Receiver verification pending: Your account must be approved by an administrator before you can request and claim medicines."
        )

    try:
        med = await db.medicines.find_one({"_id": ObjectId(payload.medicine_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid medicine ID")
    if not med:
        raise HTTPException(status_code=404, detail="Medicine listing not found")
    if med.get("status") != "available" or med.get("quantity", 0) <= 0:
        raise HTTPException(status_code=400, detail="Medicine is no longer available")

    # Safety: Expiry check before claim
    try:
        med_exp = datetime.strptime(med["expiry_date"], "%Y-%m-%d").date()
        if med_exp <= datetime.now(timezone.utc).date():
            raise HTTPException(status_code=400, detail="Safety Violation: This medicine has expired and cannot be dispensed.")
    except (ValueError, KeyError):
        pass

    # Safety: Prescription Requirement Check
    if med.get("prescription_required", False):
        if not payload.prescription_certified:
            raise HTTPException(
                status_code=400,
                detail="Prescription Required: Under the Drugs and Cosmetics Act (Schedule H), this prescription-grade medicine requires certification of a valid medical practitioner's prescription."
            )

    # Quantity check
    if payload.quantity_requested > med["quantity"]:
        raise HTTPException(
            status_code=400,
            detail=f"Requested quantity ({payload.quantity_requested}) exceeds available stock ({med['quantity']})."
        )

    existing = await db.claims.find_one({
        "medicine_id": payload.medicine_id,
        "receiver_id": str(user["_id"]),
        "status": {"$in": ["pending", "accepted"]},
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active request for this medicine")

    doc = {
        "medicine_id": payload.medicine_id,
        "donor_id": str(med["donor_id"]),
        "receiver_id": str(user["_id"]),
        "message": payload.message or "",
        "quantity_requested": payload.quantity_requested,
        "prescription_doctor": payload.prescription_doctor or "",
        "prescription_rx_number": payload.prescription_rx_number or "",
        "prescription_certified": payload.prescription_certified or False,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.claims.insert_one(doc)
    doc["_id"] = res.inserted_id

    # Post initial system note in thread
    rx_note = " [Prescription Certified by Receiver]" if payload.prescription_certified else ""
    await db.messages.insert_one({
        "claim_id": str(res.inserted_id),
        "sender_id": "system",
        "sender_name": "NearVita Network",
        "text": f"New donation request for {payload.quantity_requested} unit(s) submitted.{rx_note}",
        "created_at": datetime.now(timezone.utc),
    })

    return await serialize_claim(doc)


@api.get("/claims")
async def list_claims(role: Optional[str] = None, user=Depends(get_current_user)):
    uid = str(user["_id"])
    if user.get("role") == "admin":
        filt = {}
    elif role == "donor" or user.get("role") == "donor":
        filt = {"donor_id": uid}
    elif role == "receiver" or user.get("role") == "receiver":
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
        raise HTTPException(status_code=400, detail="Invalid claim ID")
    if not c:
        raise HTTPException(status_code=404, detail="Claim request not found")

    is_donor = str(c["donor_id"]) == str(user["_id"])
    is_admin = user.get("role") == "admin"
    if not is_donor and not is_admin:
        raise HTTPException(status_code=403, detail="Only the donor or administrator can update this claim")

    current_status = c.get("status", "pending")
    new_status = payload.status
    qty_req = c.get("quantity_requested", 1)

    # State Machine Validation: Prevent illegal transitions
    if current_status in ("rejected", "completed"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot modify this claim: it has already been {current_status}."
        )

    if current_status == "pending" and new_status not in ("accepted", "rejected"):
        raise HTTPException(
            status_code=400,
            detail=f"A pending claim can only be accepted or rejected. Cannot transition to '{new_status}'."
        )

    if current_status == "accepted" and new_status not in ("completed", "rejected"):
        raise HTTPException(
            status_code=400,
            detail=f"An accepted claim can only be marked completed or cancelled/rejected."
        )

    # Atomic Quantity & Status Handling
    if new_status == "accepted" and current_status == "pending":
        # Concurrency safety: Atomically check that sufficient quantity exists and decrement
        res = await db.medicines.update_one(
            {"_id": ObjectId(c["medicine_id"]), "quantity": {"$gte": qty_req}},
            {"$inc": {"quantity": -qty_req}}
        )
        if res.modified_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Insufficient stock: This medicine no longer has enough available units or was claimed."
            )
        
        # Check remaining quantity
        updated_med = await db.medicines.find_one({"_id": ObjectId(c["medicine_id"])})
        if updated_med and updated_med.get("quantity", 0) <= 0:
            await db.medicines.update_one({"_id": ObjectId(c["medicine_id"])}, {"$set": {"status": "reserved"}})

    elif new_status == "rejected" and current_status == "accepted":
        # Return previously reserved stock back to the medicine pool
        await db.medicines.update_one(
            {"_id": ObjectId(c["medicine_id"])},
            {"$inc": {"quantity": qty_req}, "$set": {"status": "available"}}
        )

    elif new_status == "completed" and current_status == "accepted":
        # Delivery finalized
        updated_med = await db.medicines.find_one({"_id": ObjectId(c["medicine_id"])})
        if updated_med and updated_med.get("quantity", 0) <= 0:
            await db.medicines.update_one({"_id": ObjectId(c["medicine_id"])}, {"$set": {"status": "delivered"}})

    # Update claim record
    await db.claims.update_one(
        {"_id": ObjectId(claim_id)},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
    )

    # Post automated audit trail message
    sys_text = {
        "accepted": f"Request accepted by donor. {qty_req} unit(s) reserved. Please coordinate pickup / courier details.",
        "rejected": "Request was declined by donor.",
        "completed": "Handover confirmed and completed. Medicine delivered for patient care.",
    }.get(new_status, f"Claim status updated to {new_status}")

    await db.messages.insert_one({
        "claim_id": claim_id,
        "sender_id": "system",
        "sender_name": "NearVita System",
        "text": sys_text,
        "created_at": datetime.now(timezone.utc),
    })

    c = await db.claims.find_one({"_id": ObjectId(claim_id)})
    return await serialize_claim(c)


# ---------- Claim Messages ----------
@api.get("/claims/{claim_id}/messages")
async def get_messages(claim_id: str, user=Depends(get_current_user)):
    try:
        c = await db.claims.find_one({"_id": ObjectId(claim_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid claim ID")
    if not c:
        raise HTTPException(status_code=404, detail="Claim not found")
    uid = str(user["_id"])
    if user.get("role") != "admin" and uid not in (str(c["donor_id"]), str(c["receiver_id"])):
        raise HTTPException(status_code=403, detail="Forbidden: You are not a party to this coordination thread")

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
        raise HTTPException(status_code=400, detail="Invalid claim ID")
    if not c:
        raise HTTPException(status_code=404, detail="Claim not found")
    uid = str(user["_id"])
    if user.get("role") != "admin" and uid not in (str(c["donor_id"]), str(c["receiver_id"])):
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


# ---------- Secured Receipts & Payment Records (Audit Log) ----------
def serialize_payment(p: dict) -> dict:
    return {
        "id": str(p["_id"]),
        "transaction_id": p.get("transaction_id", ""),
        "medicine_id": str(p.get("medicine_id", "")),
        "medicine_name": p.get("medicine_name", ""),
        "quantity": p.get("quantity", 1),
        "status": p.get("status", "completed"),
        "payer_id": str(p.get("payer_id", "")),
        "payer_name": p.get("payer_name", ""),
        "delivery_address": p.get("delivery_address", ""),
        "contact_phone": p.get("contact_phone", ""),
        "created_at": p["created_at"].isoformat() if isinstance(p.get("created_at"), datetime) else p.get("created_at"),
    }


@api.get("/payments/history")
async def payment_history(user=Depends(get_current_user)):
    uid = str(user["_id"])
    docs = await db.payments.find({"payer_id": uid}).sort("created_at", -1).to_list(100)
    return [serialize_payment(p) for p in docs]


@api.get("/payments/{txn_id}")
async def get_payment_receipt(txn_id: str, user=Depends(get_current_user)):
    p = await db.payments.find_one({"transaction_id": txn_id})
    if not p:
        try:
            p = await db.payments.find_one({"_id": ObjectId(txn_id)})
        except Exception:
            pass
    if not p:
        raise HTTPException(status_code=404, detail="Receipt record not found")

    # Security check: Only the involved payer, donor, or admin can access receipt data
    uid = str(user["_id"])
    if user.get("role") != "admin" and str(p.get("payer_id")) != uid and str(p.get("donor_id")) != uid:
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to inspect this record")

    return serialize_payment(p)


# ---------- Admin Endpoints ----------
@api.get("/admin/receivers")
async def admin_list_receivers(admin=Depends(require_admin)):
    receivers = await db.users.find({"role": "receiver"}).sort("created_at", -1).to_list(500)
    return [serialize_user(r) for r in receivers]


@api.patch("/admin/receivers/{receiver_id}/status")
async def admin_update_receiver_status(receiver_id: str, payload: ReceiverStatusIn, admin=Depends(require_admin)):
    try:
        obj_id = ObjectId(receiver_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid receiver ID")

    res = await db.users.update_one(
        {"_id": obj_id, "role": "receiver"},
        {"$set": {"is_approved": payload.is_approved}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Receiver not found")

    user = await db.users.find_one({"_id": obj_id})
    return serialize_user(user)


@api.get("/admin/overview")
async def admin_overview(admin=Depends(require_admin)):
    total_receivers = await db.users.count_documents({"role": "receiver"})
    pending_receivers = await db.users.count_documents({"role": "receiver", "is_approved": {"$ne": True}})
    approved_receivers = await db.users.count_documents({"role": "receiver", "is_approved": True})
    total_donors = await db.users.count_documents({"role": "donor"})
    total_medicines = await db.medicines.count_documents({})
    available_medicines = await db.medicines.count_documents({"status": "available"})
    total_claims = await db.claims.count_documents({})
    pending_claims = await db.claims.count_documents({"status": "pending"})
    completed_claims = await db.claims.count_documents({"status": "completed"})

    return {
        "total_receivers": total_receivers,
        "pending_receivers": pending_receivers,
        "approved_receivers": approved_receivers,
        "total_donors": total_donors,
        "total_medicines": total_medicines,
        "available_medicines": available_medicines,
        "total_claims": total_claims,
        "pending_claims": pending_claims,
        "completed_claims": completed_claims,
    }


# ---------- Platform Public Stats ----------
@api.get("/stats")
async def stats():
    total_meds = await db.medicines.count_documents({"status": "available"})
    total_donors = await db.users.count_documents({"role": "donor"})
    total_receivers = await db.users.count_documents({"role": "receiver", "is_approved": True})
    total_delivered = await db.claims.count_documents({"status": "completed"})
    return {
        "available_medicines": total_meds,
        "donors": total_donors,
        "receivers": total_receivers,
        "delivered": total_delivered,
    }


# ---------- Secured Internal Status (Admin Only) ----------
@api.get("/system/status")
async def system_status(admin=Depends(require_admin)):
    med_count = await db.medicines.count_documents({})
    user_count = await db.users.count_documents({})
    claim_count = await db.claims.count_documents({})
    msg_count = await db.messages.count_documents({})

    return {
        "service": "NearVita API Service",
        "status": "operational",
        "database_engine": db_mode,
        "database_name": db_name,
        "collections": {
            "users": user_count,
            "medicines": med_count,
            "claims": claim_count,
            "messages": msg_count,
        },
        "version": "2.5.0-production",
        "time_utc": datetime.now(timezone.utc).isoformat(),
    }


@api.get("/")
async def root():
    return {
        "service": "NearVita — Surplus Medicine Redistribution Network",
        "status": "operational",
        "model": "Zero Resale · 100% Free Donation",
        "version": "2.5.0",
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


# ---------- Database Startup & Cleanup of Legacy Seed Data ----------
async def cleanup_fake_seed_data():
    """Purge fake seed data and initialize the legitimate admin account."""
    # 1. Clean up legacy fake entities
    fake_emails = ["donor@nearvita.health", "receiver@nearvita.health"]
    fake_orgs = ["Apollo Pharmacy Network", "Care India Foundation", "Apollo Care & Surplus Depot"]
    
    deleted_users = await db.users.delete_many({
        "$or": [
            {"email": {"$in": fake_emails}},
            {"name": {"$in": fake_orgs}},
            {"organization": {"$in": fake_orgs}}
        ]
    })
    if deleted_users.deleted_count > 0:
        logger.info("Purged %d legacy fake seed accounts", deleted_users.deleted_count)

    # 2. Initialize Legitimate Admin Account from Environment if configured
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@nearvita.health").lower().strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@1234")
    
    if admin_email and admin_password:
        admin_user = await db.users.find_one({"email": admin_email})
        if not admin_user:
            await db.users.insert_one({
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "name": "Platform Administrator",
                "role": "admin",
                "organization": "NearVita Governance",
                "location": "Bengaluru, IN",
                "phone": "+91 80 2345 6789",
                "is_approved": True,
                "created_at": datetime.now(timezone.utc),
            })
            logger.info("Admin account configured: %s", admin_email)
        else:
            # Ensure admin has required role and approval
            await db.users.update_one(
                {"_id": admin_user["_id"]},
                {"$set": {"role": "admin", "is_approved": True}}
            )


@app.on_event("startup")
async def startup():
    global client, db, db_mode
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
            if not HAVE_MOCK:
                logger.exception("Could not reach MongoDB at %s: %s", _redact_mongo_url(mongo_url), e)
                raise RuntimeError(f"MongoDB connection failed: {e}") from e
            logger.warning(
                "MongoDB at %s is not reachable (%s). Falling back gracefully to embedded in-memory engine.",
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
        await db.password_resets.create_index("token", unique=True)
    except Exception as e:
        logger.debug("Index creation note: %s", e)

    await cleanup_fake_seed_data()


@app.on_event("shutdown")
async def shutdown():
    try:
        client.close()
    except Exception:
        pass
