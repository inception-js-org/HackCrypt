import os
from pathlib import Path
from pinecone import Pinecone
from dotenv import load_dotenv

# Load .env from backend directory (go up from core -> app -> backend)
backend_dir = Path(__file__).resolve().parent.parent.parent
env_path = backend_dir / '.env'

# Debug: print path to verify
print(f"Looking for .env at: {env_path}")
print(f".env exists: {env_path.exists()}")

load_dotenv(dotenv_path=env_path)

# Validate required environment variables
api_key = os.getenv("PINECONE_API_KEY")
index_name = os.getenv("PINECONE_INDEX_NAME")
host = os.getenv("PINECONE_HOST")

if not api_key:
    raise ValueError(f"PINECONE_API_KEY not found. Checked .env at: {env_path}")

pc = Pinecone(api_key=api_key)
index = pc.Index(name=index_name, host=host)

__all__ = ["index", "pc"]
