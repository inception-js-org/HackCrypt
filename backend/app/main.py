from fastapi import FastAPI

app = FastAPI(
    title="Unified Identity Verification Backend",
    description="Backend for identity and presence verification",
    version="0.1.0"
)

@app.get("/")
def health_check():
    return {
        "status": "Backend running",
        "message": "FastAPI app initialized correctly"
    }
