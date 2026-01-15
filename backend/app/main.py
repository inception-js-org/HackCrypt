from fastapi import FastAPI
from app.api.test import router as test_router

app = FastAPI(
    title="Unified Identity Verification Backend",
    version="0.1.0"
)

app.include_router(test_router)

@app.get("/")
def health_check():
    return {"status": "Backend running"}
