from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import serial
import serial.tools.list_ports
import random
import time
from typing import Optional

router = APIRouter()

# ============ SERIAL CONFIG ============
SERIAL_PORT = "COM3"  # Change this to your Arduino's COM port
BAUD_RATE = 9600
serial_connection = None

def get_serial_connection():
    global serial_connection
    if serial_connection is None or not serial_connection.is_open:
        try:
            serial_connection = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)
            print(f"Serial port {SERIAL_PORT} opened successfully")
            # Wait for Arduino to finish resetting (Arduino resets on serial connection)
            time.sleep(3)
            # Clear any startup messages
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
    message: str | None = None
    error: str | None = None

# ============ ENDPOINTS ============
@router.post("/enroll", response_model=FingerprintResponse)
def fingerprint_enroll(request: FingerprintEnrollRequest = None):
    """Enroll a fingerprint via Arduino sensor"""
    
    student_id = request.studentId if request and request.studentId else random.randint(1, 127)
    
    ser = get_serial_connection()
    if ser is None:
        raise HTTPException(status_code=500, detail="Failed to connect to fingerprint sensor")
    
    try:
        command = f"FP_ENROLL {student_id}\n"
        # Clear buffers
        try:
            ser.reset_input_buffer()
            ser.reset_output_buffer()
        except Exception:
            pass
        
        # Send command
        ser.write(command.encode())
        ser.flush()
        print(f"Sent to Arduino: {command}")

        # Read Arduino responses for up to 30 seconds (enrollment takes time)
        resp_lines = []
        start = time.time()
        timeout = 30.0
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
                    
                    # Check for success or failure
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
            success=success or len(resp_lines) > 0,
            studentId=student_id,
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