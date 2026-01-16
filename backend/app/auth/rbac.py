from fastapi import Depends, HTTPException
from .clerk_auth import verify_clerk_token

def require_role(allowed_roles: list):
    def checker(user=Depends(verify_clerk_token)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403)
        return user
    return checker

require_student = require_role(["STUDENT"])
require_faculty = require_role(["FACULTY"])
require_admin = require_role(["ADMIN"])
