from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import time
import numpy as np
import threading
import logging
from collections import defaultdict
from typing import Dict, List

from app.core.startup import on_startup, on_shutdown, get_embedder
from app.services.embedding_cache import embedding_cache
from app.core.pinecone_client import index
from app.api import enroll, identify, fingerprint

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

app = FastAPI(title="HackCrypt Attendance System")

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

# Verification buffer for robust recognition
# Structure: {session_id: {student_id: [confidence_scores]}}
verification_buffer: Dict[int, Dict[str, List[float]]] = defaultdict(lambda: defaultdict(list))

# Track marked students to prevent duplicates
# Structure: {session_id: {student_id: timestamp}}
marked_students: Dict[int, Dict[str, float]] = defaultdict(dict)

# Configuration
CONFIDENCE_THRESHOLD = 0.55
VERIFICATION_COUNT = 3  # Require 3 detections before marking
COOLDOWN_SECONDS = 600  # 10 minutes cooldown

app.include_router(enroll.router, prefix="/enroll", tags=["Enrollment"])
app.include_router(identify.router, prefix="/identify", tags=["Identification"])
app.include_router(fingerprint.router, prefix="/api/fingerprint", tags=["Fingerprint"])

MATCH_THRESHOLD = 0.55


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize system on startup."""
    await on_startup()
    logger.info("Application startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    await on_shutdown()
    logger.info("Application shutdown complete")

# ============== SHARED CAMERA MANAGER ==============
class CameraManager:
    """Thread-safe singleton camera manager"""
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.cap = None
        self.frame_lock = threading.Lock()
        self.camera_lock = threading.Lock()  # Lock for camera operations
        self.current_frame = None
        self.last_frame_time = 0
        self.is_running = False
        self.capture_thread = None
        self.ref_count = 0
        self.ref_lock = threading.Lock()
        self.error_count = 0
        self.max_errors = 5
        
    def start(self):
        """Start camera capture thread"""
        with self.ref_lock:
            self.ref_count += 1
            if self.is_running and self.capture_thread and self.capture_thread.is_alive():
                print(f"📷 Camera already running, ref_count: {self.ref_count}")
                return True
        
        # Reset error count on new start
        self.error_count = 0
        
        print("📷 Starting camera...")
        
        with self.camera_lock:
            # Release any existing camera
            if self.cap is not None:
                try:
                    self.cap.release()
                except:
                    pass
                self.cap = None
                time.sleep(0.5)  # Give camera time to release
            
            # Try different backends
            backends = [
                (cv2.CAP_DSHOW, "DirectShow"),
                (cv2.CAP_MSMF, "Media Foundation"),
                (cv2.CAP_ANY, "Default"),
            ]
            
            for backend, name in backends:
                print(f"📷 Trying {name} backend...")
                try:
                    self.cap = cv2.VideoCapture(0, backend)
                    if self.cap.isOpened():
                        # Test read
                        ret, _ = self.cap.read()
                        if ret:
                            print(f"✅ Camera opened with {name} backend")
                            break
                        else:
                            self.cap.release()
                            self.cap = None
                except Exception as e:
                    print(f"❌ {name} backend failed: {e}")
                    if self.cap:
                        try:
                            self.cap.release()
                        except:
                            pass
                    self.cap = None
            
            if self.cap is None or not self.cap.isOpened():
                print("❌ Cannot open camera with any backend")
                with self.ref_lock:
                    self.ref_count -= 1
                return False
            
            # Set camera properties for better performance
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize buffer for real-time
        
        self.is_running = True
        self.capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.capture_thread.start()
        
        # Wait for first frame
        for _ in range(50):  # Wait up to 5 seconds
            time.sleep(0.1)
            with self.frame_lock:
                if self.current_frame is not None:
                    print("✅ Camera started successfully")
                    return True
        
        print("⚠️ Camera started but no frames received yet")
        return True
    
    def _capture_loop(self):
        """Continuously capture frames in background thread"""
        print("📷 Capture loop started")
        consecutive_errors = 0
        
        while self.is_running:
            try:
                with self.camera_lock:
                    if self.cap is None or not self.cap.isOpened():
                        print("❌ Camera not available in capture loop")
                        break
                    
                    ret, frame = self.cap.read()
                
                if ret and frame is not None:
                    consecutive_errors = 0
                    with self.frame_lock:
                        self.current_frame = frame.copy()
                        self.last_frame_time = time.time()
                else:
                    consecutive_errors += 1
                    if consecutive_errors > 10:
                        print(f"⚠️ Too many consecutive read failures ({consecutive_errors})")
                        time.sleep(0.1)
                        consecutive_errors = 0  # Reset and try again
                
                time.sleep(0.016)  # ~60 FPS capture rate
                
            except cv2.error as e:
                self.error_count += 1
                print(f"⚠️ OpenCV error in capture loop: {e}")
                if self.error_count >= self.max_errors:
                    print("❌ Too many errors, stopping capture loop")
                    break
                time.sleep(0.1)
            except Exception as e:
                self.error_count += 1
                print(f"⚠️ Error in capture loop: {e}")
                if self.error_count >= self.max_errors:
                    print("❌ Too many errors, stopping capture loop")
                    break
                time.sleep(0.1)
        
        print("📷 Capture loop ended")
        self.is_running = False
    
    def get_frame(self):
        """Get the latest frame (thread-safe)"""
        with self.frame_lock:
            if self.current_frame is not None:
                # Check if frame is too old (more than 2 seconds)
                if time.time() - self.last_frame_time > 2.0:
                    return False, None
                return True, self.current_frame.copy()
            return False, None
    
    def is_healthy(self):
        """Check if camera is working properly"""
        if not self.is_running:
            return False
        if self.capture_thread is None or not self.capture_thread.is_alive():
            return False
        with self.frame_lock:
            if self.current_frame is None:
                return False
            if time.time() - self.last_frame_time > 2.0:
                return False
        return True
    
    def restart(self):
        """Force restart the camera"""
        print("🔄 Restarting camera...")
        self.force_stop()
        time.sleep(1)
        return self.start()
    
    def stop(self):
        """Stop camera (only when all refs released)"""
        with self.ref_lock:
            self.ref_count -= 1
            if self.ref_count > 0:
                print(f"📷 Camera still in use, ref_count: {self.ref_count}")
                return
        
        print("📷 Stopping camera...")
        self.is_running = False
        
        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=2)
        
        with self.camera_lock:
            if self.cap:
                try:
                    self.cap.release()
                except:
                    pass
                self.cap = None
        
        with self.frame_lock:
            self.current_frame = None
        
        print("✅ Camera stopped")
    
    def force_stop(self):
        """Force stop camera regardless of refs"""
        print("📷 Force stopping camera...")
        with self.ref_lock:
            self.ref_count = 0
        
        self.is_running = False
        
        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=2)
        
        with self.camera_lock:
            if self.cap:
                try:
                    self.cap.release()
                except:
                    pass
                self.cap = None
        
        with self.frame_lock:
            self.current_frame = None
        
        print("✅ Camera force stopped")

# Global camera manager
camera_manager = CameraManager()

# Store latest identification results for overlay
identification_results = {
    'faces': [],
    'last_update': 0
}
results_lock = threading.Lock()

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up camera on shutdown"""
    camera_manager.force_stop()

@app.get("/camera/status")
async def camera_status():
    """Check camera health"""
    return {
        "is_running": camera_manager.is_running,
        "is_healthy": camera_manager.is_healthy(),
        "ref_count": camera_manager.ref_count,
        "error_count": camera_manager.error_count
    }

@app.post("/camera/restart")
async def restart_camera():
    """Force restart camera"""
    success = camera_manager.restart()
    return {"success": success, "message": "Camera restarted" if success else "Failed to restart camera"}

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
    }

def generate_enrollment_frames(student_id: str):
    """Generate video frames and collect face samples during enrollment"""
    # Get the global embedder instance
    embedder = get_embedder()
    
    if not camera_manager.start():
        print("ERROR: Cannot start camera")
        # Yield an error frame
        error_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(error_frame, "Camera Error - Please restart", (100, 240),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        ret, buffer = cv2.imencode('.jpg', error_frame)
        if ret:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        return
    
    print(f"Camera ready for student {student_id}")
    
    # Initialize session with proper structure
    enrollment_sessions[student_id] = {
        'embeddings': [],
        'completed': False,
        'samples': 0
    }
    
    embeddings = []
    frame_count = 0
    target_samples = 15
    last_detection_time = 0
    no_frame_count = 0
    
    try:
        while len(embeddings) < target_samples:
            ret, frame = camera_manager.get_frame()
            if not ret or frame is None:
                no_frame_count += 1
                if no_frame_count > 100:  # ~3 seconds of no frames
                    print("⚠️ No frames for too long, attempting camera restart")
                    if camera_manager.restart():
                        no_frame_count = 0
                    else:
                        break
                time.sleep(0.03)
                continue
            
            no_frame_count = 0
            frame_count += 1
            current_time = time.time()
            
            # Detect faces every 200ms (5 times per second)
            if current_time - last_detection_time >= 0.2:
                last_detection_time = current_time
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
                    import traceback
                    traceback.print_exc()
            
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
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()
            
            # Yield frame in multipart format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            time.sleep(0.033)  # ~30 FPS output
        
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
        import traceback
        traceback.print_exc()
    finally:
        camera_manager.stop()
        print(f"Camera released for student {student_id}")

def generate_identify_frames():
    """Generate video frames for identification mode with live recognition"""
    global identification_results
    
    # Get the global embedder instance
    embedder = get_embedder()
    
    if not camera_manager.start():
        print("ERROR: Cannot start camera for identification")
        # Yield an error frame
        error_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(error_frame, "Camera Error - Please restart", (100, 240),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        ret, buffer = cv2.imencode('.jpg', error_frame)
        if ret:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        return
    
    print("Camera ready for identification mode")
    last_detection_time = 0
    cached_faces = []  # Cache face detection results
    no_frame_count = 0
    
    try:
        while True:
            # Check if camera is still healthy
            if not camera_manager.is_running:
                print("⚠️ Camera stopped, attempting restart...")
                if not camera_manager.restart():
                    break
            
            ret, frame = camera_manager.get_frame()
            if not ret or frame is None:
                no_frame_count += 1
                if no_frame_count > 100:  # ~3 seconds of no frames
                    print("⚠️ No frames for too long, attempting camera restart")
                    if camera_manager.restart():
                        no_frame_count = 0
                    else:
                        # Send error frame
                        error_frame = np.zeros((480, 640, 3), dtype=np.uint8)
                        cv2.putText(error_frame, "Camera Error - Reconnecting...", (80, 240),
                                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                        ret, buffer = cv2.imencode('.jpg', error_frame)
                        if ret:
                            yield (b'--frame\r\n'
                                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                time.sleep(0.03)
                continue
            
            no_frame_count = 0
            current_time = time.time()
            
            # Run face detection/identification every 300ms (reduced CPU load)
            if current_time - last_detection_time >= 0.3:
                last_detection_time = current_time
                try:
                    faces = embedder.app.get(frame)
                    cached_faces = []
                    
                    for face in faces:
                        bbox = face.bbox.astype(int)
                        embedding = face.embedding / np.linalg.norm(face.embedding)
                        
                        # Try local cache first
                        cache_result = embedding_cache.search(embedding, top_k=1, threshold=MATCH_THRESHOLD)
                        
                        identity = "Student"
                        confidence = 0.0
                        source = "none"
                        
                        if cache_result and len(cache_result) > 0:
                            # Cache hit
                            identity = cache_result[0]['student_id']
                            confidence = cache_result[0]['score']
                            source = "cache"
                            logger.info(f"Cache hit: {identity} ({confidence:.3f})")
                        else:
                            # Cache miss - query Pinecone
                            logger.info("Cache miss, querying Pinecone...")
                            result = index.query(
                                vector=embedding.tolist(),
                                top_k=1,
                                include_metadata=True
                            )
                            
                            if result["matches"]:
                                match = result["matches"][0]
                                confidence = float(match["score"])
                                
                                if confidence >= MATCH_THRESHOLD:
                                    identity = str(match["id"])
                                    source = "pinecone"
                        
                        cached_faces.append({
                            'bbox': bbox.tolist(),
                            'identity': identity,
                            'confidence': confidence,
                            'source': source
                        })
                    
                    # Update global results for POST endpoint
                    with results_lock:
                        identification_results['faces'] = cached_faces
                        identification_results['last_update'] = current_time
                        
                except Exception as e:
                    print(f"Error in identification: {e}")
                    import traceback
                    traceback.print_exc()
            
            # Draw cached face results on frame
            for face_data in cached_faces:
                bbox = face_data['bbox']
                if isinstance(bbox, np.ndarray):
                    bbox = bbox.tolist()
                identity = face_data['identity']
                confidence = face_data['confidence']
                source = face_data.get('source', 'none')
                
                color = (0, 255, 0) if identity != "Unknown" else (0, 0, 255)
                
                cv2.rectangle(frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), color, 2)
                label = f"{identity} ({confidence:.2f})"
                cv2.putText(frame, label, (bbox[0], bbox[1]-10),
                          cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                
                # Show source (cache/pinecone)
                if source != 'none':
                    cv2.putText(frame, f"[{source}]", (bbox[0], bbox[3]+20),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Add identification mode indicator
            cv2.putText(frame, "IDENTIFICATION MODE", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            
            # Show cache stats
            cache_stats = embedding_cache.get_stats()
            cv2.putText(frame, f"Cache: {cache_stats['total_embeddings']} embeddings", (10, 460),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if not ret:
                continue
            
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            time.sleep(0.033)  # ~30 FPS output
            
    except GeneratorExit:
        print("Client disconnected from identification feed")
    except Exception as e:
        print(f"Error in identification stream: {e}")
        import traceback
        traceback.print_exc()
    finally:
        camera_manager.stop()
        print("Camera released from identification mode")

@app.get("/video_feed")
async def video_feed(student_id: str = Query(None), mode: str = Query("enroll")):
    """Stream webcam video feed"""
    if mode == "identify":
        print("📹 Starting identification video feed")
        return StreamingResponse(
            generate_identify_frames(),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    else:
        if not student_id:
            raise HTTPException(status_code=400, detail="student_id required for enrollment mode")
        print(f"📹 Video feed requested for student: {student_id}")
        return StreamingResponse(
            generate_enrollment_frames(student_id),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )

@app.get("/identify/latest")
async def get_latest_identification():
    """Get latest identification results (use this instead of POST /identify/webcam)"""
    with results_lock:
        return {
            "success": True,
            "faces": identification_results['faces'],
            "last_update": identification_results['last_update']
        }

@app.post("/enroll/webcam")
async def enroll_webcam(student_id: str = Query(...)):
    """Complete enrollment by storing embeddings to Pinecone"""
    if student_id not in enrollment_sessions:
        raise HTTPException(status_code=404, detail="No enrollment session found")
    
    session = enrollment_sessions[student_id]
    
    if not session.get('completed'):
        raise HTTPException(status_code=400, detail="Enrollment not completed yet")
    
    embeddings = session.get('embeddings', [])
    
    if len(embeddings) < 5:
        raise HTTPException(status_code=400, detail=f"Not enough samples: {len(embeddings)}/15")
    
    try:
        # Average all embeddings
        final_embedding = np.mean(embeddings, axis=0)
        final_embedding = (final_embedding / np.linalg.norm(final_embedding)).tolist()
        
        # Store in Pinecone with student_id as the vector ID
        index.upsert([
            (
                str(student_id),  # Use student DB ID as Pinecone ID
                final_embedding,
                {"type": "student"}
            )
        ])
        
        # Add to local cache immediately
        embedding_cache.add_embedding(
            student_id=str(student_id),
            embedding=np.array(final_embedding),
            metadata={"type": "student"}
        )
        
        logger.info(f"✅ Enrolled student {student_id} with {len(embeddings)} samples")
        
        # Clean up session
        del enrollment_sessions[student_id]
        
        return {
            "status": "success",
            "message": "Student enrolled successfully",
            "student_id": str(student_id),  # ✅ This should match DB ID
            "face_id": str(student_id),  # ✅ Added face_id field
            "samples": len(embeddings),
            "vectors_stored": 1
        }
        
    except Exception as e:
        logger.error(f"Error enrolling student: {e}")
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")

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


# ============== VERIFICATION BUFFER HELPERS ==============

def add_to_verification_buffer(session_id: int, student_id: str, confidence: float) -> bool:
    """
    Add a detection to the verification buffer.
    Returns True if student should be marked (passed verification).
    
    Args:
        session_id: Session ID for attendance
        student_id: Student identifier
        confidence: Recognition confidence score
        
    Returns:
        bool: True if verification passed and attendance should be marked
    """
    # Add confidence score to buffer
    verification_buffer[session_id][student_id].append(confidence)
    
    # Keep only last VERIFICATION_COUNT scores
    if len(verification_buffer[session_id][student_id]) > VERIFICATION_COUNT:
        verification_buffer[session_id][student_id] = \
            verification_buffer[session_id][student_id][-VERIFICATION_COUNT:]
    
    # Check if we have enough detections
    if len(verification_buffer[session_id][student_id]) >= VERIFICATION_COUNT:
        # Calculate average confidence
        avg_confidence = np.mean(verification_buffer[session_id][student_id])
        
        logger.info(
            f"Verification check - Student: {student_id}, "
            f"Detections: {len(verification_buffer[session_id][student_id])}, "
            f"Avg confidence: {avg_confidence:.3f}"
        )
        
        # Check if average meets threshold
        if avg_confidence >= CONFIDENCE_THRESHOLD:
            # Check for duplicates and cooldown
            if should_mark_attendance(session_id, student_id):
                # Clear buffer for this student
                verification_buffer[session_id][student_id].clear()
                return True
    
    return False


def should_mark_attendance(session_id: int, student_id: str) -> bool:
    """
    Check if attendance should be marked for this student.
    Prevents duplicates and enforces cooldown.
    
    Args:
        session_id: Session ID for attendance
        student_id: Student identifier
        
    Returns:
        bool: True if attendance can be marked
    """
    current_time = time.time()
    
    # Check if already marked in this session
    if student_id in marked_students[session_id]:
        last_marked_time = marked_students[session_id][student_id]
        
        # Check cooldown
        if current_time - last_marked_time < COOLDOWN_SECONDS:
            logger.info(
                f"Cooldown active for student {student_id} "
                f"(marked {int(current_time - last_marked_time)}s ago)"
            )
            return False
    
    # Mark as attended
    marked_students[session_id][student_id] = current_time
    logger.info(f"✅ Attendance marked for student {student_id} in session {session_id}")
    return True


def clear_session_data(session_id: int):
    """Clear verification buffer and marked students for a session."""
    if session_id in verification_buffer:
        del verification_buffer[session_id]
    if session_id in marked_students:
        del marked_students[session_id]
    logger.info(f"Cleared session data for session {session_id}")


@app.get("/health")
async def health_check():
    """Health check endpoint with system stats."""
    embedder = get_embedder()
    cache_stats = embedding_cache.get_stats()
    
    return {
        "status": "healthy",
        "cache": cache_stats,
        "gpu_enabled": embedder.ctx_id == 0,
        "active_sessions": len(verification_buffer),
        "timestamp": time.time()
    }

