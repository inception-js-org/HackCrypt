from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import time
from app.services.face_embedding import FaceEmbedder
from app.core.pinecone_client import index
from app.api import enroll, identify
from app.api import enroll, identify, fingerprint

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track enrollment sessions
enrollment_sessions = {}
embedder = FaceEmbedder()
app.include_router(enroll.router, prefix="/enroll", tags=["Enrollment"])
app.include_router(identify.router, prefix="/identify", tags=["Identification"])
app.include_router(fingerprint.router, prefix="/api/fingerprint", tags=["Fingerprint"])

@app.post("/enroll/webcam/start")
async def start_webcam_enrollment(student_id: str = Query(...)):
    """Initialize webcam enrollment session"""
    print(f"Starting enrollment session for student: {student_id}")
    
    enrollment_sessions[student_id] = {
        'embeddings': [],
        'completed': False,
        'samples': 0,
        'started': True
    }
    
    return {
        "message": "Enrollment session started",
        "student_id": student_id,
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

def generate_enrollment_frames(student_id: str):
    """Generate video frames and collect face samples during enrollment"""
    cap = cv2.VideoCapture(0)
    
    # Wait for camera to initialize
    time.sleep(1)
    
    # Set camera properties
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    if not cap.isOpened():
        print("ERROR: Cannot open camera")
        cap.release()
        return
    
    print(f"Camera opened successfully for student {student_id}")
    
    # Initialize session with proper structure
    enrollment_sessions[student_id] = {
        'embeddings': [],
        'completed': False,
        'samples': 0
    }
    
    embeddings = []
    frame_count = 0
    target_samples = 15
    
    try:
        while len(embeddings) < target_samples:
            ret, frame = cap.read()
            if not ret:
                print("ERROR: Cannot read frame")
                break
            
            frame_count += 1
            
            # Detect faces every 5 frames (more frequent detection)
            if frame_count % 5 == 0:
                try:
                    faces = embedder.app.get(frame)
                    
                    if len(faces) > 0:
                        # Get first face embedding
                        face = faces[0]
                        embedding = face.embedding.tolist()
                        embeddings.append(embedding)
                        
                        # Update session with current progress
                        enrollment_sessions[student_id]['embeddings'] = embeddings
                        enrollment_sessions[student_id]['samples'] = len(embeddings)
                        
                        print(f"Face detected! Sample {len(embeddings)}/{target_samples}")
                        
                        # Draw rectangle around detected face
                        bbox = face.bbox.astype(int)
                        cv2.rectangle(frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 3)
                        cv2.putText(frame, "Face Detected!", (bbox[0], bbox[1]-10), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    else:
                        # No face detected
                        cv2.putText(frame, "No face detected", (10, 90),
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                except Exception as e:
                    print(f"Error detecting face: {e}")
            
            # Add progress overlay
            progress = len(embeddings)
            cv2.putText(frame, f"Samples: {progress}/{target_samples}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            cv2.putText(frame, f"Student ID: {student_id}", (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Progress bar
            bar_width = 400
            bar_height = 20
            filled_width = int((progress / target_samples) * bar_width)
            cv2.rectangle(frame, (10, 100), (10 + bar_width, 100 + bar_height), (255, 255, 255), 2)
            cv2.rectangle(frame, (10, 100), (10 + filled_width, 100 + bar_height), (0, 255, 0), -1)
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()
            
            # Yield frame in multipart format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            time.sleep(0.033)  # ~30 FPS
        
        # Store embeddings for this session
        enrollment_sessions[student_id] = {
            'embeddings': embeddings,
            'completed': True,
            'samples': len(embeddings)
        }
        print(f"✅ Enrollment completed for student {student_id}: {len(embeddings)} samples collected")
            
    except GeneratorExit:
        print(f"Client disconnected for student {student_id}")
    except Exception as e:
        print(f"Error during enrollment: {e}")
    finally:
        cap.release()
        print(f"Camera released for student {student_id}")

@app.get("/video_feed")
async def video_feed(student_id: str = Query(...)):
    """Stream webcam video feed during enrollment"""
    print(f"📹 Video feed requested for student: {student_id}")
    
    return StreamingResponse(
        generate_enrollment_frames(student_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/enroll/webcam")
async def enroll_webcam(student_id: str = Query(...)):
    """Complete enrollment by storing embeddings to Pinecone"""
    print(f"💾 Completing enrollment for student: {student_id}")
    
    # Check if session exists
    if student_id not in enrollment_sessions:
        raise HTTPException(status_code=400, detail="No enrollment session found. Please start video feed first.")
    
    session = enrollment_sessions[student_id]
    
    if not session.get('completed', False):
        raise HTTPException(status_code=400, detail="Enrollment not completed. Please wait for all samples to be collected.")
    
    embeddings = session.get('embeddings', [])
    
    if len(embeddings) == 0:
        raise HTTPException(status_code=400, detail="No face detected during enrollment")
    
    print(f"Averaging {len(embeddings)} embeddings...")
    
    # Calculate average embedding
    import numpy as np
    avg_embedding = np.mean(embeddings, axis=0)
    avg_embedding = avg_embedding / np.linalg.norm(avg_embedding)  # Normalize
    avg_embedding_list = avg_embedding.tolist()
    
    print(f"Storing 1 averaged embedding to Pinecone...")
    
    # Store only ONE averaged embedding in Pinecone
    try:
        index.upsert(vectors=[{
            "id": student_id,
            "values": avg_embedding_list,
            "metadata": {"student_id": student_id, "type": "student"}
        }])
        print(f"✅ Successfully stored averaged embedding in Pinecone")
    except Exception as e:
        print(f"❌ Error storing vector: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to store embedding: {str(e)}")
    
    # Clean up session
    del enrollment_sessions[student_id]
    
    return {
        "message": "Face enrolled successfully",
        "student_id": student_id,
        "samples": len(embeddings),
        "samples_averaged": len(embeddings),
        "vectors_stored": 1,
        "face_id": student_id  # Return face_id for frontend
    }

@app.get("/enroll/webcam/status")
async def check_enrollment_status(student_id: str = Query(...)):
    """Check enrollment progress"""
    if student_id not in enrollment_sessions:
        return {"status": "not_started", "samples": 0}
    
    session = enrollment_sessions[student_id]
    return {
        "status": "completed" if session.get('completed', False) else "in_progress",
        "samples": session.get('samples', 0),
        "completed": session.get('completed', False)
    }
