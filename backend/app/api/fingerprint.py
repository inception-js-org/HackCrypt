from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import serial
import serial.tools.list_ports
import time
import random
import json

router = APIRouter()

# ============ SERIAL CONFIG ============
SERIAL_PORT = "COM5"  # Change this to your Arduino's COM port
BAUD_RATE = 9600
serial_connection = None

def get_serial_connection():
    global serial_connection
    if serial_connection is None or not serial_connection.is_open:
        try:
            serial_connection = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)
            print(f"Serial port {SERIAL_PORT} opened successfully")
            time.sleep(3)
            serial_connection.reset_input_buffer()
            serial_connection.reset_output_buffer()
        except Exception as e:
            print(f"Failed to open serial port: {e}")
            return None
    return serial_connection

# ============ MODELS ============
class FingerprintEnrollRequest(BaseModel):
    studentId: int | None = None

class FingerprintResponse(BaseModel):
    success: bool
    studentId: int | None = None
    fingerprintId: str | None = None
    message: str | None = None
    error: str | None = None

# ============ SSE STREAMING ENROLLMENT ============
def generate_enrollment_stream(student_id: int):
    """Generator for SSE streaming enrollment progress with curated messages"""
    fingerprint_id = str(student_id)
    
    def send_event(event_type: str, message: str, icon: str = "", data: dict = None):
        payload = {
            "type": event_type,
            "message": message,
            "icon": icon,
            **(data or {})
        }
        return f"data: {json.dumps(payload)}\n\n"
    
    ser = get_serial_connection()
    if ser is None:
        yield send_event("error", "Failed to connect to fingerprint sensor", "❌")
        return
    
    try:
        ser.reset_input_buffer()
        ser.reset_output_buffer()
        
        command = f"FP_ENROLL {student_id}\n"
        ser.write(command.encode())
        ser.flush()
        
        # Send initial connecting message
        yield send_event("info", "Connecting to fingerprint sensor...", "🔄")
        time.sleep(0.5)
        
        start = time.time()
        timeout = 60.0
        success = False
        sensor_detected = False
        first_place_sent = False
        remove_sent = False
        second_place_sent = False
        
        while time.time() - start < timeout:
            if ser.in_waiting > 0:
                line = ser.readline()
                try:
                    decoded = line.decode(errors="ignore").strip()
                except Exception:
                    decoded = str(line)
                
                if decoded:
                    print(f"Arduino: {decoded}")  # Log for debugging
                    
                    # Skip command echoes and menu text
                    skip_phrases = [
                        "===", "Commands:", "FP_ENROLL", "FP_MATCH", 
                        "FP_STOP", "FP_CLEAR", "FINGERPRINT SYSTEM"
                    ]
                    if any(phrase in decoded for phrase in skip_phrases):
                        continue
                    
                    # Curated message handling
                    if "sensor detected" in decoded.lower() or ("detected" in decoded.lower() and not sensor_detected):
                        sensor_detected = True
                        yield send_event("info", "Fingerprint sensor ready", "✅")
                        time.sleep(0.3)
                        
                    elif ("Place finger" in decoded or "👉" in decoded) and "SAME" not in decoded and not first_place_sent:
                        first_place_sent = True
                        yield send_event("action", "Place your finger on the sensor", "👆", {"step": 1, "total": 3})
                        
                    elif "Remove finger" in decoded or "✋" in decoded:
                        if not remove_sent:
                            remove_sent = True
                            yield send_event("action", "Remove your finger", "✋", {"step": 2, "total": 3})
                        
                    elif ("Place" in decoded and "SAME" in decoded) or (("Place finger" in decoded or "👉" in decoded) and first_place_sent and not second_place_sent):
                        second_place_sent = True
                        yield send_event("action", "Place the SAME finger again", "👆", {"step": 3, "total": 3})
                        
                    elif "SUCCESS" in decoded.upper() or "🎉" in decoded:
                        yield send_event("success", "Fingerprint enrolled successfully!", "🎉", {
                            "studentId": student_id,
                            "fingerprintId": fingerprint_id,
                            "completed": True
                        })
                        success = True
                        break
                        
                    elif "FAILED" in decoded.upper() or "ERROR" in decoded.upper() or "❌" in decoded:
                        yield send_event("error", "Enrollment failed. Please try again.", "❌")
                        break
            else:
                time.sleep(0.1)
        
        if not success and time.time() - start >= timeout:
            yield send_event("error", "Enrollment timed out. Please try again.", "⏰")
            
    except Exception as e:
        yield send_event("error", f"Error: {str(e)}", "❌")

@router.get("/enroll/stream/{student_id}")
async def fingerprint_enroll_stream(student_id: int):
    """Stream fingerprint enrollment progress via SSE"""
    return StreamingResponse(
        generate_enrollment_stream(student_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

# ============ REGULAR ENDPOINTS ============
@router.post("/enroll", response_model=FingerprintResponse)
def fingerprint_enroll(request: FingerprintEnrollRequest = None):
    """Enroll a fingerprint via Arduino sensor (non-streaming)"""
    
    student_id = request.studentId if request and request.studentId else random.randint(1, 127)
    fingerprint_id = str(student_id)
    
    ser = get_serial_connection()
    if ser is None:
        raise HTTPException(status_code=500, detail="Failed to connect to fingerprint sensor")
    
    try:
        command = f"FP_ENROLL {student_id}\n"
        try:
            ser.reset_input_buffer()
            ser.reset_output_buffer()
        except Exception:
            pass
        
        ser.write(command.encode())
        ser.flush()
        print(f"Sent to Arduino: {command}")

        resp_lines = []
        start = time.time()
        timeout = 60.0
        success = False
        
        while time.time() - start < timeout:
            if ser.in_waiting > 0:
                line = ser.readline()
                try:
                    decoded = line.decode(errors="ignore").strip()
                except Exception:
                    decoded = str(line)
                
                if decoded:
                    print(f"Arduino: {decoded}")
                    resp_lines.append(decoded)
                    
                    if "SUCCESS" in decoded.upper():
                        success = True
                        break
                    elif "FAILED" in decoded.upper():
                        success = False
                        break
            else:
                time.sleep(0.1)

        message = "\n".join(resp_lines) if resp_lines else "Fingerprint enrollment started"
        
        return FingerprintResponse(
            success=success,
            studentId=student_id,
            fingerprintId=fingerprint_id if success else None,
            message=message,
            error=None if success else "Check Arduino connection"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ports")
def list_serial_ports():
    """List available serial ports"""
    ports = serial.tools.list_ports.comports()
    return {
        "ports": [{"device": p.device, "description": p.description} for p in ports]
    }