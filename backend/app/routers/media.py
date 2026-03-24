"""Media upload + deepfake analysis endpoint."""
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.engine.deepfake_detector import analyze

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 20


@router.post("/analyze")
async def analyze_media(file: UploadFile = File(...)):
    """Upload an image for deepfake forensic analysis."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported type: {file.content_type}. Use JPEG, PNG, WebP, or GIF.")

    contents = await file.read()
    if len(contents) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max {MAX_SIZE_MB}MB.")

    result = await analyze(contents)
    result["filename"] = file.filename
    return result
