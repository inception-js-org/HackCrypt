from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import serial
import serial.tools.list_ports
import random
import time
from typing import Optional

router = APIRouter()

# ============ SERIAL CONFIG ============
SERIAL_PORT = None  # Auto-detect Arduino port
BAUD_RATE = 9600
serial_connection = None

def find_arduino_port():
    """Auto-detect Arduino COM port"""
    ports = serial.tools.list_ports.comports()
    print("Available ports:")
    for port in ports:
        print(f"  - {port.device}: {port.description}")
        # Check for Arduino in description
        if "Arduino" in port.description or "CH340" in port.description or "USB" in port.description:
            print(f"  ✓ Found Arduino at {port.device}")
            return port.device
    
    # If no Arduino found, return first available port
    if ports:
        print(f"  → Using first available port: {ports[0].device}")
        return ports[0].device
    
    print("  ✗ No COM ports found!")
    return None

def get_serial_connection():
    global serial_connection, SERIAL_PORT
    
    # Close any existing connection
    if serial_connection is not None:
        try:
            if serial_connection.is_open:
                serial_connection.close()
                print("Closed previous serial connection")
        except Exception as e:
            print(f"Error closing connection: {e}")
        serial_connection = None
    
    # Auto-detect port if not set
    if SERIAL_PORT is None:
        SERIAL_PORT = find_arduino_port()
    
    if SERIAL_PORT is None:
        print("❌ No COM port available!")
        return None
    
    # Try to open the port
    try:
        serial_connection = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)
        print(f"✅ Serial port {SERIAL_PORT} opened successfully")
        # Wait for Arduino to finish resetting (Arduino resets on serial connection)
        time.sleep(3)
        # Clear any startup messages
        serial_connection.reset_input_buffer()
        serial_connection.reset_output_buffer()
        return serial_connection
    except serial.SerialException as e:
        print(f"❌ Failed to open {SERIAL_PORT}: {e}")
        print("💡 Make sure:")
        print("   1. Arduino IDE Serial Monitor is CLOSED")
        print("   2. No other program is using the port")
        print("   3. Arduino is connected via USB")
        serial_connection = None
        SERIAL_PORT = None  # Reset so we try to detect again next time
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        serial_connection = None
        return None

# ============ MODELS ============
class FingerprintEnrollRequest(BaseModel):
    studentId: int | None = None

class FingerprintMatchRequest(BaseModel):
    sessionId: int | None = None

class FingerprintStopRequest(BaseModel):
    pass

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

@router.post("/match", response_model=FingerprintResponse)
def fingerprint_match(request: FingerprintMatchRequest = None):
    """Match a fingerprint via Arduino sensor and return student ID"""
    
    session_id = request.sessionId if request and request.sessionId else None
    
    ser = get_serial_connection()
    if ser is None:
        raise HTTPException(status_code=500, detail="Failed to connect to fingerprint sensor")
    
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
                    
                    # Check for match success: "MATCHED ID: 5" or "MATCH:5"
                    if "MATCHED" in decoded.upper() or "MATCH" in decoded.upper():
                        # Try to extract ID
                        import re
                        match = re.search(r'\d+', decoded)
                        if match:
                            matched_id = int(match.group())
                            success = True
                            print(f"✓ Matched fingerprint ID: {matched_id}")
                            break
                    elif "NOT FOUND" in decoded.upper() or "NO MATCH" in decoded.upper():
                        success = False
                        break
            else:
                time.sleep(0.1)

        message = "\n".join(resp_lines) if resp_lines else "Fingerprint matching started"
        
        return FingerprintResponse(
            success=success,
            studentId=matched_id,
            message=message,
            error=None if success else "No fingerprint match found"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop", response_model=FingerprintResponse)
def fingerprint_stop(request: FingerprintStopRequest = None):
    """Stop fingerprint operation via Arduino sensor"""
    
    ser = get_serial_connection()
    if ser is None:
        raise HTTPException(status_code=500, detail="Failed to connect to fingerprint sensor")
    
    try:
        command = "FP_STOP\n"
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

        # Read Arduino responses for up to 3 seconds
        resp_lines = []
        start = time.time()
        timeout = 3.0
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
                    
                    # Check for confirmation
                    if "STOPPED" in decoded.upper() or "OK" in decoded.upper():
                        success = True
                        break
            else:
                time.sleep(0.1)

        message = "\n".join(resp_lines) if resp_lines else "Fingerprint operation stopped"
        
        return FingerprintResponse(
            success=True,  # Always return success for stop command
            studentId=None,
            message=message,
            error=None
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