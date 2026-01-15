from fastapi import FastAPI
from app.api import enroll, identify

app = FastAPI(
    title="Intelligent Attendance System",
    description="Face-based identity and attendance APIs",
    version="1.0"
)

app.include_router(enroll.router, prefix="/enroll", tags=["Enrollment"])
app.include_router(identify.router, prefix="/identify", tags=["Identification"])
