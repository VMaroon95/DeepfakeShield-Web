"""
LinkScanner — URL phishing/scam detection engine.

Checks URLs against:
1. Typosquatting patterns (e.g., amaz0n.com, paypa1.com)
2. Suspicious TLD/domain patterns
3. Google Safe Browsing API (when key available)
4. Known phishing indicators
"""
import re
import time
from urllib.parse import urlparse
import httpx

# Known legitimate domains → common typosquats
TYPOSQUAT_MAP = {
    "amazon": ["amaz0n", "amazn", "amazom", "arnazon", "anazon"],
    "google": ["go0gle", "googl", "g00gle", "gogle", "googie"],
    "paypal": ["paypa1", "paypai", "paypl", "paypall", "paypa-l"],
    "apple": ["app1e", "appie", "aple", "applle", "apple-id"],
    "microsoft": ["micros0ft", "mircosoft", "microsft", "rnicrosoft"],
    "facebook": ["faceb00k", "facebok", "faceboook", "facebook-login"],
    "instagram": ["1nstagram", "instagran", "lnstagram", "instagrm"],
    "netflix": ["netf1ix", "netfllx", "netflex", "netflix-login"],
    "bank": ["bankofamerica-login", "chase-secure", "wellsfarg0"],
    "crypto": ["coinbas3", "binanace", "metamask-wallet"],
}

SUSPICIOUS_TLDS = {
    ".xyz", ".top", ".club", ".work", ".click", ".loan",
    ".tk", ".ml", ".ga", ".cf", ".gq", ".buzz", ".surf",
}

SUSPICIOUS_PATTERNS = [
    r"login.*verify",
    r"secure.*update",
    r"account.*suspended",
    r"confirm.*identity",
    r"\..*\..*\..*\.",  # 4+ subdomains
    r"\d{5,}",  # long number sequences in domain
    r"free.*gift",
    r"winner.*claim",
]

GOOGLE_SAFE_BROWSING_KEY = None  # Set via env var


async def scan_url(url: str) -> dict:
    """Scan a URL for phishing/scam indicators."""
    start = time.time()
    findings = []
    risk_score = 0

    # Normalize
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        full_url = url.lower()
    except Exception:
        return {"error": "Invalid URL", "risk_score": 100}

    # ── Check 1: Typosquatting ──
    for legit, typos in TYPOSQUAT_MAP.items():
        for typo in typos:
            if typo in domain:
                findings.append({
                    "type": "typosquat",
                    "severity": "high",
                    "detail": f"Domain resembles '{legit}' — possible typosquatting: '{typo}'",
                })
                risk_score += 35

    # ── Check 2: Suspicious TLD ──
    for tld in SUSPICIOUS_TLDS:
        if domain.endswith(tld):
            findings.append({
                "type": "suspicious_tld",
                "severity": "medium",
                "detail": f"Uses suspicious TLD: {tld}",
            })
            risk_score += 15

    # ── Check 3: Pattern matching ──
    for pattern in SUSPICIOUS_PATTERNS:
        if re.search(pattern, full_url):
            findings.append({
                "type": "suspicious_pattern",
                "severity": "medium",
                "detail": f"URL matches phishing pattern: {pattern}",
            })
            risk_score += 10

    # ── Check 4: HTTP (no TLS) ──
    if parsed.scheme == "http":
        findings.append({
            "type": "no_tls",
            "severity": "low",
            "detail": "No HTTPS — connection is not encrypted",
        })
        risk_score += 10

    # ── Check 5: IP address instead of domain ──
    if re.match(r"\d+\.\d+\.\d+\.\d+", domain.split(":")[0]):
        findings.append({
            "type": "ip_address",
            "severity": "high",
            "detail": "URL uses raw IP address instead of domain name",
        })
        risk_score += 25

    # ── Check 6: Excessive subdomains ──
    subdomain_count = domain.count(".")
    if subdomain_count >= 3:
        findings.append({
            "type": "excessive_subdomains",
            "severity": "medium",
            "detail": f"Domain has {subdomain_count} levels — unusual and potentially deceptive",
        })
        risk_score += 15

    # ── Check 7: Google Safe Browsing (if key available) ──
    gsb_result = None
    if GOOGLE_SAFE_BROWSING_KEY:
        gsb_result = await _check_google_safe_browsing(url)
        if gsb_result.get("malicious"):
            findings.append({
                "type": "safe_browsing",
                "severity": "critical",
                "detail": f"Flagged by Google Safe Browsing: {gsb_result.get('threat_type', 'unknown')}",
            })
            risk_score += 50

    # Cap at 100
    risk_score = min(risk_score, 100)

    # Verdict
    if risk_score <= 15:
        verdict = "safe"
        verdict_label = "✅ Appears Safe"
    elif risk_score <= 40:
        verdict = "caution"
        verdict_label = "⚠️ Use Caution"
    elif risk_score <= 70:
        verdict = "suspicious"
        verdict_label = "🟠 Suspicious"
    else:
        verdict = "dangerous"
        verdict_label = "🔴 Likely Scam/Phishing"

    elapsed_ms = int((time.time() - start) * 1000)

    return {
        "url": url,
        "domain": domain,
        "risk_score": risk_score,
        "verdict": verdict,
        "verdict_label": verdict_label,
        "findings": findings,
        "checks_run": 7,
        "google_safe_browsing": gsb_result,
        "processing_ms": elapsed_ms,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


async def _check_google_safe_browsing(url: str) -> dict:
    """Query Google Safe Browsing API."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GOOGLE_SAFE_BROWSING_KEY}",
                json={
                    "client": {"clientId": "deepfakeshield", "clientVersion": "1.0.0"},
                    "threatInfo": {
                        "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
                        "platformTypes": ["ANY_PLATFORM"],
                        "threatEntryTypes": ["URL"],
                        "threatEntries": [{"url": url}],
                    },
                },
                timeout=5.0,
            )
            data = resp.json()
            if data.get("matches"):
                return {"malicious": True, "threat_type": data["matches"][0].get("threatType", "unknown")}
            return {"malicious": False}
    except Exception:
        return {"malicious": False, "error": "API check failed"}
