from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import enroll, identify
from app.api import enroll, identify, fingerprint

app = FastAPI(
    title="Unified Identity Verification System",
    description="Face-based identity and attendance APIs using ArcFace (InsightFace)",
    version="2.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(enroll.router, prefix="/enroll", tags=["Enrollment"])
app.include_router(identify.router, prefix="/identify", tags=["Identification"])
app.include_router(fingerprint.router, prefix="/api/fingerprint", tags=["Fingerprint"])


@app.get("/")
def root():
    return {
        "service": "Unified Identity Verification System",
        "version": "2.0",
        "model": "ArcFace (InsightFace buffalo_l)",
        "embedding_dimension": 512,
        "endpoints": {
            "enroll": {
                "POST /enroll/": "Enroll with image upload",
                "POST /enroll/webcam": "Enroll with webcam"
            },
            "identify": {
                "POST /identify/": "Identify with image upload",
                "POST /identify/webcam": "Identify with webcam"
            },
            "fingerprint": {
                "POST /api/fingerprint/enroll": "Enroll fingerprint via Arduino",
                "GET /api/fingerprint/ports": "List available serial ports"
            }
        }
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
