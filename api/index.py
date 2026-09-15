import sys
from pathlib import Path

# Add project root and backend to python path for Vercel serverless execution
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(root_dir / "backend"))

from backend.main import app
