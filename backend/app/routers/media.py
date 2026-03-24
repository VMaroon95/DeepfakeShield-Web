"""Media upload + deepfake analysis endpoint."""
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.engine.deepfake_detector import analyze

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES

MAX_IMAGE_SIZE_MB = 20
MAX_VIDEO_SIZE_MB = 100


@router.post("/analyze")
async def analyze_media(file: UploadFile = File(...)):
    """Upload an image or video for deepfake forensic analysis."""
    if file.content_type not in ALLOWED_TYPES:
        allowed_list = ", ".join(sorted(ALLOWED_TYPES))
        raise HTTPException(400, f"Unsupported type: {file.content_type}. Allowed: {allowed_list}")

    contents = await file.read()
    
    # Check file size based on type
    is_video = file.content_type in ALLOWED_VIDEO_TYPES
    max_size = MAX_VIDEO_SIZE_MB if is_video else MAX_IMAGE_SIZE_MB
    
    if len(contents) > max_size * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max {max_size}MB for {'videos' if is_video else 'images'}.")

    # Analyze with appropriate method
    result = await analyze(contents, is_video=is_video)
    result["filename"] = file.filename
    result["file_type"] = "video" if is_video else "image"
    result["file_size_mb"] = round(len(contents) / (1024 * 1024), 2)
    
    return result
