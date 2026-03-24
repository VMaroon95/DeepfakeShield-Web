"""URL scanning endpoint."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.engine.link_scanner import scan_url

router = APIRouter()


class LinkScanRequest(BaseModel):
    url: str


@router.post("/scan")
async def scan_link(req: LinkScanRequest):
    """Scan a URL for phishing/scam indicators."""
    if not req.url or len(req.url) < 4:
        raise HTTPException(400, "Invalid URL")
    result = await scan_url(req.url)
    return result
