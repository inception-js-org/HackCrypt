from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import serial
import serial.tools.list_ports
import time

router = APIRouter()

# Serial connection settings
BAUD_RATE = 57600
TIMEOUT = 10

class EnrollRequest(BaseModel):
    studentId: int

class IdentifyResponse(BaseModel):
    success: bool
    fingerprintId: Optional[str] = None
    message: str

def get_arduino_port():
    """Find Arduino port automatically"""
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "Arduino" in port.description or "CH340" in port.description or "USB" in port.description:
            return port.device
    return None

def send_command(ser, command: str, wait_time: float = 0.5) -> str:
    """Send command to Arduino and get response"""
    ser.write(f"{command}\n".encode())
    time.sleep(wait_time)
    response = ""
    while ser.in_waiting:
        response += ser.read(ser.in_waiting).decode()
        time.sleep(0.1)
    return response.strip()

@router.get("/ports")
async def list_ports():
    """List available serial ports"""
    ports = serial.tools.list_ports.comports()
    return {
        "ports": [{"device": p.device, "description": p.description} for p in ports]
    }

@router.post("/enroll")
async def enroll_fingerprint(request: EnrollRequest):
    """Enroll a new fingerprint"""
    port = get_arduino_port()
    if not port:
        raise HTTPException(status_code=500, detail="Arduino not found")
    
    try:
        ser = serial.Serial(port, BAUD_RATE, timeout=TIMEOUT)
        time.sleep(2)  # Wait for Arduino to initialize
        
        # Send enroll command with slot ID
        slot_id = ((request.studentId - 1) % 127) + 1
        response = send_command(ser, f"ENROLL:{slot_id}", wait_time=15)
        
        ser.close()
        
        if "SUCCESS" in response or "stored" in response.lower():
            return {
                "success": True,
                "fingerprintId": f"FP_{slot_id}",
                "message": response
            }
        else:
            return {
                "success": False,
                "message": response or "Enrollment failed"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/identify")
async def identify_fingerprint():
    """Identify a fingerprint"""
    port = get_arduino_port()
    if not port:
        return IdentifyResponse(success=False, message="Arduino not connected")
    
    try:
        ser = serial.Serial(port, BAUD_RATE, timeout=TIMEOUT)
        time.sleep(0.5)
        
        # Send identify command
        response = send_command(ser, "IDENTIFY", wait_time=5)
        
        ser.close()
        
        # Parse response for fingerprint ID
        if "FOUND:" in response:
            # Extract ID from response like "FOUND:5"
            parts = response.split("FOUND:")
            if len(parts) > 1:
                fp_id = parts[1].split()[0].strip()
                return IdentifyResponse(
                    success=True,
                    fingerprintId=f"FP_{fp_id}",
                    message="Fingerprint identified"
                )
        
        return IdentifyResponse(
            success=False,
            message=response or "No fingerprint detected"
        )
    except Exception as e:
        return IdentifyResponse(success=False, message=str(e))

@router.post("/verify")
async def verify_fingerprint(student_id: int):
    """Verify a specific student's fingerprint"""
    port = get_arduino_port()
    if not port:
        raise HTTPException(status_code=500, detail="Arduino not found")
    
    try:
        ser = serial.Serial(port, BAUD_RATE, timeout=TIMEOUT)
        time.sleep(0.5)
        
        slot_id = ((student_id - 1) % 127) + 1
        response = send_command(ser, f"VERIFY:{slot_id}", wait_time=5)
        
        ser.close()
        
        if "MATCH" in response.upper():
            return {"success": True, "verified": True, "message": "Fingerprint verified"}
        else:
            return {"success": True, "verified": False, "message": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))