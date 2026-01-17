import os
from pathlib import Path
from pinecone import Pinecone
from dotenv import load_dotenv

# Load .env from the backend directory (where it's typically located)
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Debug: Print to verify the path and key loading
# print(f"Looking for .env at: {env_path}")
# print(f"PINECONE_API_KEY loaded: {os.getenv('PINECONE_API_KEY') is not None}")

api_key = os.getenv("PINECONE_API_KEY")
if not api_key:
    raise ValueError(f"PINECONE_API_KEY not found. Checked .env at: {env_path}")

pc = Pinecone(api_key=api_key)
index = pc.Index(
    name=os.getenv("PINECONE_INDEX_NAME"),
    host=os.getenv("PINECONE_HOST")
)
__all__ = ["index", "pc"]