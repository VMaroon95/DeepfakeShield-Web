"""
DeepfakeShield Web — FastAPI Backend
Handles media upload (deepfake detection) and URL scanning (phishing/scam).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import media, links

app = FastAPI(
    title="DeepfakeShield API",
    description="Deepfake detection + Link safety scanning",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(media.router, prefix="/api/media", tags=["Media Analysis"])
app.include_router(links.router, prefix="/api/links", tags=["Link Scanner"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "DeepfakeShield API", "version": "1.0.0"}
