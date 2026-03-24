"""
LinkScanner — Advanced URL phishing/scam detection engine.

Checks URLs against:
1. Typosquatting patterns (e.g., amaz0n.com, paypa1.com)
2. Suspicious TLD/domain patterns
3. Google Safe Browsing API (when key available)
4. Known phishing indicators
5. Domain age verification (flags domains < 30 days)
6. SSL/HTTPS certificate verification
7. Visual phishing detection (screenshot comparison)
8. Local scam database cross-reference
"""
import re
import time
import ssl
import socket
import subprocess
import asyncio
from urllib.parse import urlparse
from pathlib import Path
import httpx
import whois
import imagehash
from PIL import Image
from playwright.async_api import async_playwright
from app.engine.scam_db import check_domain_reputation, init_database

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
    """Scan a URL for phishing/scam indicators with advanced checks."""
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

    # Initialize database if needed
    try:
        await init_database()
    except:
        pass

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

    # ── Check 7: Domain Age ──
    domain_age_result = await _check_domain_age(domain)
    domain_age_days = domain_age_result.get("age_days")
    
    if domain_age_days is not None:
        if domain_age_days < 30:
            findings.append({
                "type": "domain_age",
                "severity": "high",
                "detail": f"Domain is only {domain_age_days} days old — very recently created",
            })
            risk_score += 40
        elif domain_age_days < 90:
            findings.append({
                "type": "domain_age", 
                "severity": "medium",
                "detail": f"Domain is {domain_age_days} days old — relatively new",
            })
            risk_score += 20
    elif domain_age_result.get("error"):
        findings.append({
            "type": "domain_age",
            "severity": "low",
            "detail": "Could not verify domain age — WHOIS lookup failed",
        })
        risk_score += 5

    # ── Check 8: SSL/HTTPS Certificate ──
    ssl_info = await _check_ssl_certificate(domain, parsed.port or (443 if parsed.scheme == "https" else 80))
    
    if parsed.scheme == "https":
        if not ssl_info.get("valid"):
            findings.append({
                "type": "ssl_invalid",
                "severity": "high", 
                "detail": f"Invalid SSL certificate: {ssl_info.get('error', 'Unknown error')}",
            })
            risk_score += 30
        elif ssl_info.get("issuer") and "let's encrypt" in ssl_info.get("issuer", "").lower():
            # Check if this is a financial domain with Let's Encrypt
            financial_keywords = ["bank", "credit", "paypal", "visa", "mastercard", "bitcoin", "crypto"]
            if any(keyword in domain for keyword in financial_keywords):
                findings.append({
                    "type": "ssl_suspicious",
                    "severity": "medium",
                    "detail": "Financial domain using Let's Encrypt certificate — potentially suspicious",
                })
                risk_score += 25

    # ── Check 9: Scam Database Cross-Reference ──
    scam_db_result = await check_domain_reputation(domain)
    if scam_db_result.get("found"):
        report_count = scam_db_result.get("report_count", 0)
        auto_blocked = scam_db_result.get("auto_blocked", False)
        
        if auto_blocked:
            findings.append({
                "type": "scam_database",
                "severity": "critical",
                "detail": f"Domain auto-blocked due to {report_count} user reports",
            })
            risk_score += 60
        else:
            findings.append({
                "type": "scam_database",
                "severity": "high" if report_count >= 2 else "medium",
                "detail": f"Domain has {report_count} user report(s) in scam database",
            })
            risk_score += 30 if report_count >= 2 else 15

    # ── Check 10: Visual Phishing Detection ──
    visual_result = await _check_visual_phishing(url)
    if visual_result.get("suspicious"):
        findings.append({
            "type": "visual_phishing",
            "severity": visual_result.get("severity", "medium"),
            "detail": visual_result.get("detail", "Visual similarity to known brand detected"),
        })
        risk_score += visual_result.get("score_increase", 25)

    # ── Check 11: Google Safe Browsing (if key available) ──
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
        "domain_age_days": domain_age_days,
        "ssl_info": ssl_info,
        "scam_db_result": scam_db_result,
        "visual_result": visual_result,
        "checks_run": 11,
        "google_safe_browsing": gsb_result,
        "processing_ms": elapsed_ms,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


async def _check_domain_age(domain: str) -> dict:
    """Check domain age using python-whois."""
    try:
        # Run whois lookup in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        w = await loop.run_in_executor(None, whois.whois, domain)
        
        if w and w.creation_date:
            creation_date = w.creation_date
            if isinstance(creation_date, list):
                creation_date = creation_date[0]
            
            if creation_date:
                age_days = (time.time() - creation_date.timestamp()) / 86400
                return {
                    "age_days": int(age_days),
                    "creation_date": creation_date.strftime("%Y-%m-%d"),
                    "registrar": getattr(w, 'registrar', None)
                }
                
        return {"error": "Could not determine domain age", "age_days": None}
        
    except Exception as e:
        return {"error": f"WHOIS lookup failed: {str(e)}", "age_days": None}


async def _check_ssl_certificate(domain: str, port: int) -> dict:
    """Check SSL certificate validity and details."""
    if port != 443:
        return {"valid": False, "error": "Not HTTPS"}
        
    try:
        # Create SSL context
        context = ssl.create_default_context()
        
        # Connect and get certificate info
        loop = asyncio.get_event_loop()
        
        def get_cert_info():
            with socket.create_connection((domain, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    return cert
                    
        cert = await loop.run_in_executor(None, get_cert_info)
        
        if cert:
            # Extract certificate details
            issuer = dict(x[0] for x in cert.get('issuer', []))
            subject = dict(x[0] for x in cert.get('subject', []))
            
            # Check expiration
            not_after = cert.get('notAfter')
            if not_after:
                # Parse SSL date format: 'MMM DD HH:MM:SS YYYY GMT'
                expiry_time = time.strptime(not_after, '%b %d %H:%M:%S %Y %Z')
                expiry_timestamp = time.mktime(expiry_time)
                days_until_expiry = (expiry_timestamp - time.time()) / 86400
                
                if days_until_expiry < 0:
                    return {"valid": False, "error": "Certificate expired"}
                elif days_until_expiry < 30:
                    expiry_warning = f"Certificate expires in {int(days_until_expiry)} days"
                else:
                    expiry_warning = None
            else:
                expiry_warning = None
                
            return {
                "valid": True,
                "issuer": issuer.get('organizationName', 'Unknown'),
                "subject": subject.get('commonName', domain),
                "expiry_warning": expiry_warning,
                "serial_number": cert.get('serialNumber'),
                "version": cert.get('version')
            }
        
        return {"valid": False, "error": "No certificate information"}
        
    except ssl.SSLError as e:
        return {"valid": False, "error": f"SSL Error: {str(e)}"}
    except socket.gaierror:
        return {"valid": False, "error": "Domain not found"}
    except Exception as e:
        return {"valid": False, "error": f"Certificate check failed: {str(e)}"}


async def _check_visual_phishing(url: str) -> dict:
    """Check for visual phishing by taking screenshot and comparing with brand logos."""
    try:
        # Use Playwright to take screenshot
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(
                viewport={'width': 1280, 'height': 720},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            )
            
            try:
                # Set timeout and take screenshot
                await page.goto(url, wait_until='domcontentloaded', timeout=15000)
                await page.wait_for_timeout(2000)  # Let page render
                
                screenshot_bytes = await page.screenshot(
                    type='png',
                    clip={'x': 0, 'y': 0, 'width': 1280, 'height': 400}  # Top portion of page
                )
                
                await browser.close()
                
                # Convert screenshot to hash for comparison
                from PIL import Image
                import io
                screenshot_image = Image.open(io.BytesIO(screenshot_bytes))
                screenshot_hash = imagehash.average_hash(screenshot_image)
                
                # Load and compare with known brand logos
                logos_dir = Path(__file__).parent / "brand_logos"
                suspicion_score = 0
                matched_brands = []
                
                # Check against saved logo hashes (placeholder implementation)
                # In production, you would have actual logo files and their hashes
                known_brand_hashes = _get_known_brand_hashes()
                
                for brand_name, brand_hash in known_brand_hashes.items():
                    try:
                        hash_diff = screenshot_hash - imagehash.hex_to_hash(brand_hash)
                        if hash_diff < 15:  # Similar hashes
                            matched_brands.append(brand_name)
                            suspicion_score += 30
                    except:
                        continue
                
                # Check for suspicious visual patterns
                domain = urlparse(url).netloc.lower()
                
                # Check if domain doesn't match detected brands
                brand_mismatch = False
                for brand in matched_brands:
                    if brand.lower() not in domain:
                        brand_mismatch = True
                        suspicion_score += 40
                        
                if suspicion_score > 30:
                    severity = "high" if suspicion_score > 60 else "medium"
                    detail = f"Visual similarity to {', '.join(matched_brands)} detected"
                    if brand_mismatch:
                        detail += " but domain doesn't match brand"
                        
                    return {
                        "suspicious": True,
                        "severity": severity,
                        "detail": detail,
                        "matched_brands": matched_brands,
                        "score_increase": min(suspicion_score, 50)
                    }
                
                return {"suspicious": False, "matched_brands": []}
                
            except Exception as e:
                await browser.close()
                return {"suspicious": False, "error": f"Screenshot failed: {str(e)}"}
                
    except Exception as e:
        return {"suspicious": False, "error": f"Visual check failed: {str(e)}"}


def _get_known_brand_hashes() -> dict:
    """Get known brand logo hashes for comparison. In production, load from files."""
    # Placeholder hashes - in production these would be computed from actual logo files
    return {
        "PayPal": "ff81818181818181",
        "Amazon": "00ff00ff00ff00ff", 
        "Google": "f0f0f0f0f0f0f0f0",
        "Apple": "0f0f0f0f0f0f0f0f",
        "Microsoft": "aaaaaaaaaaaaaaaa",
        "Facebook": "5555555555555555",
        "Netflix": "3333333333333333",
        "Instagram": "cccccccccccccccc"
    }


async def _check_google_safe_browsing(url: str) -> dict:
    """Query Google Safe Browsing API."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GOOGLE_SAFE_BROWSING_KEY}",
                json={
                    "client": {"clientId": "deepfakeshield", "clientVersion": "2.0.0"},
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
