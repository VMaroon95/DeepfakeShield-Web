"""
GAN Noise Fingerprinting Module
Detects GAN artifacts through frequency-domain analysis (DCT/FFT).
"""
import io
import numpy as np
from PIL import Image
import time

def analyze_gan_artifacts(image_bytes: bytes) -> dict:
    """
    Analyze image for GAN artifacts using frequency-domain analysis.
    Returns heuristic-based analysis of high-frequency energy patterns.
    """
    start = time.time()
    
    try:
        # Load and convert to grayscale for analysis
        img = Image.open(io.BytesIO(image_bytes)).convert('L')
        img = img.resize((256, 256), Image.LANCZOS)
        img_array = np.array(img, dtype=np.float32)
        
        # FFT Analysis
        fft_2d = np.fft.fft2(img_array)
        fft_shifted = np.fft.fftshift(fft_2d)
        magnitude_spectrum = np.abs(fft_shifted)
        
        # Calculate high-frequency energy ratio
        h, w = magnitude_spectrum.shape
        center_h, center_w = h // 2, w // 2
        
        # Define high-frequency region (outer 30% of spectrum)
        high_freq_mask = np.zeros((h, w), dtype=bool)
        for i in range(h):
            for j in range(w):
                dist_from_center = np.sqrt((i - center_h)**2 + (j - center_w)**2)
                if dist_from_center > min(center_h, center_w) * 0.7:
                    high_freq_mask[i, j] = True
        
        total_energy = np.sum(magnitude_spectrum**2)
        high_freq_energy = np.sum(magnitude_spectrum[high_freq_mask]**2)
        high_freq_ratio = high_freq_energy / total_energy if total_energy > 0 else 0
        
        # DCT Analysis for block artifacts
        block_size = 8
        dct_anomalies = 0
        blocks_analyzed = 0
        
        for i in range(0, img_array.shape[0] - block_size, block_size):
            for j in range(0, img_array.shape[1] - block_size, block_size):
                block = img_array[i:i+block_size, j:j+block_size]
                
                # Apply DCT
                dct_block = np.fft.fft2(block)
                dct_magnitudes = np.abs(dct_block)
                
                # Check for unusual DCT coefficient patterns
                high_freq_dct = np.sum(dct_magnitudes[4:, 4:])
                low_freq_dct = np.sum(dct_magnitudes[:4, :4])
                
                if low_freq_dct > 0:
                    ratio = high_freq_dct / low_freq_dct
                    # GAN images often have unusual high/low frequency ratios
                    if ratio > 0.3 or ratio < 0.05:
                        dct_anomalies += 1
                
                blocks_analyzed += 1
        
        dct_anomaly_ratio = dct_anomalies / blocks_analyzed if blocks_analyzed > 0 else 0
        
        # Calculate GAN probability based on heuristics
        gan_indicators = []
        gan_score = 0
        
        # High frequency energy pattern analysis
        if high_freq_ratio > 0.15:
            gan_indicators.append("Unusual high-frequency energy distribution")
            gan_score += 25
        elif high_freq_ratio < 0.02:
            gan_indicators.append("Suspiciously low high-frequency content")
            gan_score += 15
            
        # DCT block analysis
        if dct_anomaly_ratio > 0.3:
            gan_indicators.append("DCT coefficient anomalies detected")
            gan_score += 30
        elif dct_anomaly_ratio > 0.2:
            gan_indicators.append("Moderate DCT irregularities")
            gan_score += 15
            
        # Spectral regularity check
        # Calculate variance in frequency magnitudes
        freq_variance = np.var(magnitude_spectrum)
        freq_mean = np.mean(magnitude_spectrum)
        coefficient_of_variation = (np.sqrt(freq_variance) / freq_mean) if freq_mean > 0 else 0
        
        if coefficient_of_variation > 2.0:
            gan_indicators.append("High spectral variance suggesting synthetic generation")
            gan_score += 20
        elif coefficient_of_variation < 0.5:
            gan_indicators.append("Unnaturally uniform frequency distribution")
            gan_score += 10
            
        # Radial frequency analysis
        radial_profile = []
        max_radius = min(center_h, center_w)
        for r in range(1, max_radius, 5):
            mask = np.zeros((h, w), dtype=bool)
            for i in range(h):
                for j in range(w):
                    dist = np.sqrt((i - center_h)**2 + (j - center_w)**2)
                    if r <= dist < r + 5:
                        mask[i, j] = True
            if np.any(mask):
                radial_profile.append(np.mean(magnitude_spectrum[mask]))
        
        # Check for unnatural radial patterns
        if len(radial_profile) > 3:
            radial_gradients = np.diff(radial_profile)
            unusual_transitions = np.sum(np.abs(radial_gradients) > np.std(radial_gradients) * 2)
            if unusual_transitions > len(radial_gradients) * 0.3:
                gan_indicators.append("Unnatural radial frequency patterns")
                gan_score += 15
        
        # Cap score at 100
        gan_score = min(gan_score, 100)
        
        # Determine verdict
        if gan_score <= 20:
            verdict = "natural"
            verdict_label = "✅ Likely Natural"
        elif gan_score <= 40:
            verdict = "low_concern"
            verdict_label = "🔵 Low GAN Concern"
        elif gan_score <= 65:
            verdict = "moderate_concern"
            verdict_label = "⚠️ Moderate GAN Concern"
        else:
            verdict = "high_concern"
            verdict_label = "🔴 High GAN Concern"
            
        elapsed_ms = int((time.time() - start) * 1000)
        
        return {
            "gan_score": gan_score,
            "verdict": verdict,
            "verdict_label": verdict_label,
            "indicators": gan_indicators,
            "analysis": {
                "high_freq_ratio": round(high_freq_ratio, 4),
                "dct_anomaly_ratio": round(dct_anomaly_ratio, 4),
                "spectral_variance": round(float(freq_variance), 2),
                "coefficient_of_variation": round(coefficient_of_variation, 4),
                "blocks_analyzed": blocks_analyzed,
                "dct_anomalies": dct_anomalies
            },
            "processing_ms": elapsed_ms,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        
    except Exception as e:
        return {
            "error": f"GAN analysis failed: {str(e)}",
            "gan_score": 0,
            "verdict": "error",
            "verdict_label": "❌ Analysis Error"
        }