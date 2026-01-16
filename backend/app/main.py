from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.test import router as test_router
from app.api.admin_auth import router as admin_router

app = FastAPI(
    title="Unified Identity Verification Backend",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test_router)
app.include_router(admin_router)

@app.get("/")
def health_check():
    return {"status": "Backend running"}
