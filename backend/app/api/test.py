from fastapi import APIRouter

router = APIRouter()

@router.get("/test")
def test_endpoint():
    return {
        "status": "success",
        "message": "Frontend ↔ Backend connection working"
    }
