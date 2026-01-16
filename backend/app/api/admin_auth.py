from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import os

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Hardcoded admin credentials (in production, use environment variables and hash passwords)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin#@786"
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    success: bool
    username: str
    role: str
    token: str

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(credentials: AdminLoginRequest):
    """
    Admin login endpoint with username and password authentication
    """
    if credentials.username != ADMIN_USERNAME or credentials.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Generate JWT token
    token_data = {
        "username": ADMIN_USERNAME,
        "role": "ADMIN",
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm="HS256")
    
    return AdminLoginResponse(
        success=True,
        username=ADMIN_USERNAME,
        role="ADMIN",
        token=token
    )

@router.get("/verify")
async def verify_admin_token(token: str):
    """
    Verify admin JWT token
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if payload.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Not authorized as admin")
        return {"valid": True, "username": payload.get("username"), "role": payload.get("role")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
