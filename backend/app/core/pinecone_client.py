import os
from pathlib import Path
from pinecone import Pinecone
from dotenv import load_dotenv

# Load .env from backend directory
backend_dir = Path(__file__).parent.parent.parent
env_path = backend_dir / '.env'
load_dotenv(dotenv_path=env_path)

print(f"📁 Loading .env from: {env_path}")
print(f"🔑 PINECONE_API_KEY loaded: {'Yes' if os.getenv('PINECONE_API_KEY') else 'No'}")
print(f"🌐 PINECONE_HOST loaded: {'Yes' if os.getenv('PINECONE_HOST') else 'No'}")

# Initialize Pinecone
api_key = os.getenv("PINECONE_API_KEY")
host = os.getenv("PINECONE_HOST")

if not api_key:
    raise ValueError("PINECONE_API_KEY not found in environment variables")

pc = Pinecone(api_key=api_key)

# Connect to the index
index = pc.Index(
    name="face-embeddings",
    host=host
)

print(f"✅ Connected to Pinecone index: face-embeddings")
