import requests
from jose import jwt
from fastapi import HTTPException, Header

CLERK_ISSUER = "https://clerk.dev"
CLERK_JWKS_URL = "https://api.clerk.dev/v1/jwks"

jwks = requests.get(CLERK_JWKS_URL).json()

def verify_clerk_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401)

    token = authorization.split(" ")[1]

    try:
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience="authenticated",
            issuer=CLERK_ISSUER,
        )
    except Exception:
        raise HTTPException(status_code=401)

    return {
        "clerk_user_id": payload["sub"],
        "role": payload.get("public_metadata", {}).get("role"),
    }
