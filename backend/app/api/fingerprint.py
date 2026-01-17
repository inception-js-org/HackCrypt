from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import serial
import serial.tools.list_ports
import random
import time
import re
from typing import Optional

router = APIRouter()

# ============ SERIAL CONFIG ============
SERIAL_PORT = None  # Auto-detect Arduino port
BAUD_RATE = 9600
serial_connection = None

# Track last successful match to prevent duplicate polling
last_match_time = 0
last_match_id = None
MATCH_COOLDOWN = 5.0  # Don't re-match same person within 5 seconds

def find_arduino_port():
    """Auto-detect Arduino COM port"""
    ports = serial.tools.list_ports.comports()
    for port in ports:
        # Look for Arduino-like devices
        if "Arduino" in port.description or "CH340" in port.description or "USB" in port.description:
            print(f"Found Arduino on {port.device}")
            return port.device
    # Fallback to common ports
    for port in ports:
        if "COM" in port.device or "ttyUSB" in port.device or "ttyACM" in port.device:
            return port.device
    return None

def get_serial_connection():
    global serial_connection, SERIAL_PORT
    
    if serial_connection is not None:
        try:
            if serial_connection.is_open:
                return serial_connection
        except Exception:
            serial_connection = None
    
    # Auto-detect port if not set
    if SERIAL_PORT is None:
        SERIAL_PORT = find_arduino_port()
        if SERIAL_PORT is None:
            print("❌ No Arduino port found")
            return None
    
    try:
        serial_connection = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        time.sleep(2)  # Wait for Arduino reset
        print(f"✅ Connected to Arduino on {SERIAL_PORT}")
        return serial_connection
    except Exception as e:
        print(f"❌ Failed to connect to Arduino: {e}")
        return None

# ============ MODELS ============
class FingerprintEnrollRequest(BaseModel):
    studentId: Optional[int] = None

class FingerprintMatchRequest(BaseModel):
    sessionId: Optional[int] = None

class FingerprintIdentifyRequest(BaseModel):
    sessionId: Optional[int] = None

class FingerprintStopRequest(BaseModel):
    pass

class FingerprintResponse(BaseModel):
    success: bool
    studentId: Optional[int] = None
    fingerprintId: Optional[int] = None
    confidence: Optional[int] = None
    message: Optional[str] = None
    error: Optional[str] = None

# ============ ENDPOINTS ============
@router.get("/ports")
def list_ports():
    """List available serial ports"""
    ports = serial.tools.list_ports.comports()
    return {
        "ports": [{"device": p.device, "description": p.description} for p in ports]
    }

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
            fingerprintId=student_id,
            message=message,
            error=None if success else "Check Arduino connection"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/match", response_model=FingerprintResponse)
def fingerprint_match(request: FingerprintMatchRequest = None):
    """Match a fingerprint via Arduino sensor and return student ID"""
    global last_match_time, last_match_id
    
    # Check cooldown to prevent rapid re-polling
    current_time = time.time()
    if last_match_id and (current_time - last_match_time) < MATCH_COOLDOWN:
        print(f"⏳ Returning cached match (cooldown): ID {last_match_id}")
        return FingerprintResponse(
            success=True,
            studentId=last_match_id,
            fingerprintId=last_match_id,
            message=f"Recent match: ID {last_match_id}"
        )
    
    ser = get_serial_connection()
    if ser is None:
        return FingerprintResponse(
            success=False,
            error="Failed to connect to fingerprint sensor"
        )
    
    try:
        command = "FP_MATCH\n"
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

        # Read Arduino responses for up to 10 seconds (matching is quick)
        resp_lines = []
        start = time.time()
        timeout = 10.0
        success = False
        matched_id = None
        confidence = None
        
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
                    
                    # Check for match success: "MATCH → ID: 5 | Confidence: 331"
                    if "MATCH" in decoded.upper() and "ID" in decoded.upper():
                        # Extract ID
                        id_match = re.search(r'ID[:\s]+(\d+)', decoded, re.IGNORECASE)
                        if id_match:
                            matched_id = int(id_match.group(1))
                            success = True
                            
                            # Try to extract confidence
                            conf_match = re.search(r'Confidence[:\s]+(\d+)', decoded, re.IGNORECASE)
                            if conf_match:
                                confidence = int(conf_match.group(1))
                            
                            print(f"✓ Matched fingerprint ID: {matched_id}, Confidence: {confidence}")
                            
                            # Update cooldown cache
                            last_match_time = current_time
                            last_match_id = matched_id
                            break
                    elif "NOT FOUND" in decoded.upper() or "NO MATCH" in decoded.upper():
                        success = False
                        break
                    elif "No finger detected" in decoded:
                        # Keep waiting for finger
                        pass
            else:
                time.sleep(0.1)

        message = "\n".join(resp_lines) if resp_lines else "Waiting for fingerprint..."
        
        return FingerprintResponse(
            success=success,
            studentId=matched_id,
            fingerprintId=matched_id,
            confidence=confidence,
            message=message,
            error=None if success else "No fingerprint match found"
        )
    except Exception as e:
        return FingerprintResponse(
            success=False,
            error=str(e)
        )

@router.post("/identify", response_model=FingerprintResponse)
def fingerprint_identify(request: FingerprintIdentifyRequest = None):
    """Alias for /match - identifies a fingerprint and returns the stored ID"""
    # Just call the match function
    match_request = FingerprintMatchRequest(
        sessionId=request.sessionId if request else None
    )
    return fingerprint_match(match_request)

@router.post("/stop", response_model=FingerprintResponse)
def fingerprint_stop(request: FingerprintStopRequest = None):
    """Stop ongoing fingerprint operation"""
    global serial_connection, last_match_id, last_match_time
    
    # Reset cooldown cache
    last_match_id = None
    last_match_time = 0
    
    try:
        if serial_connection and serial_connection.is_open:
            serial_connection.write(b"FP_STOP\n")
            serial_connection.flush()
        
        return FingerprintResponse(
            success=True,
            message="Stop command sent"
        )
    except Exception as e:
        return FingerprintResponse(
            success=False,
            error=str(e)
        )

@router.post("/reset-cache")
def reset_match_cache():
    """Reset the match cooldown cache"""
    global last_match_id, last_match_time
    last_match_id = None
    last_match_time = 0
    return {"success": True, "message": "Cache reset"}