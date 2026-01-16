"""
Script to download InsightFace models before running the server.
Run this once to download the buffalo_l model.
"""
import os
from insightface.model_zoo import get_model

print("Downloading InsightFace buffalo_l models...")
print("This may take a few minutes on first run...\n")

# Download detection model
print("1. Downloading detection model...")
det_model = get_model('buffalo_l', root=os.path.expanduser("~/.insightface"))
print("   ✓ Detection model downloaded\n")

# Download recognition model  
print("2. Downloading recognition model...")
rec_model = get_model('buffalo_l', root=os.path.expanduser("~/.insightface"))
print("   ✓ Recognition model downloaded\n")

print("✓ All models downloaded successfully!")
print("You can now run: uvicorn app.main:app --reload")
