from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="NeighbourHub API")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

# Serve CSS and JavaScript files
app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static",
)

# Serve the homepage from frontend/pages/index.html
@app.get("/")
def home():
    return FileResponse(FRONTEND_DIR / "pages" / "index.html")


# Backend health check
@app.get("/api/health")
def health_check():
    return {"status": "ok"}