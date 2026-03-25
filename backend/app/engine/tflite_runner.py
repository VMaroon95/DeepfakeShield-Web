"""
TFLite Runner — Ported from mobile DeepfakeShield.
Loads the EfficientNet-Lite0 TFLite model for inference.
Falls back gracefully if tflite-runtime is not available.
"""
import io
import numpy as np
from PIL import Image
from pathlib import Path

MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "deepfake_detector.tflite"
MODEL_INPUT_SIZE = 224

# Try loading TFLite runtime
_interpreter = None
_HAS_TFLITE = False

try:
    import tflite_runtime.interpreter as tflite
    _HAS_TFLITE = True
except ImportError:
    try:
        import tensorflow as tf
        tflite = tf.lite
        _HAS_TFLITE = True
    except ImportError:
        _HAS_TFLITE = False


def _load_interpreter():
    """Load the TFLite model interpreter (singleton)."""
    global _interpreter
    if _interpreter is not None:
        return _interpreter
    if not _HAS_TFLITE:
        return None
    if not MODEL_PATH.exists():
        print(f"[TFLiteRunner] Model not found at {MODEL_PATH}")
        return None
    try:
        _interpreter = tflite.Interpreter(model_path=str(MODEL_PATH))
        _interpreter.allocate_tensors()
        print(f"[TFLiteRunner] ✅ Model loaded: {MODEL_PATH.name} ({MODEL_PATH.stat().st_size / 1024 / 1024:.1f}MB)")
        return _interpreter
    except Exception as e:
        print(f"[TFLiteRunner] ⚠️ Failed to load model: {e}")
        return None


def preprocess_for_tflite(image_bytes: bytes) -> np.ndarray:
    """Resize to 224x224, normalize to [0, 1], NHWC format."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((MODEL_INPUT_SIZE, MODEL_INPUT_SIZE), Image.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)  # [1, 224, 224, 3]


def run_inference(image_bytes: bytes) -> dict:
    """
    Run TFLite inference on image bytes.
    Returns: {"score": 0-100, "raw_output": float, "model": str, "is_real": bool}
    """
    interpreter = _load_interpreter()
    if interpreter is None:
        return {"score": None, "error": "TFLite runtime not available", "model": "none"}

    input_data = preprocess_for_tflite(image_bytes)

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    # Handle quantized models
    input_dtype = input_details[0]["dtype"]
    if input_dtype == np.uint8:
        input_scale, input_zero = input_details[0].get("quantization", (1.0, 0))
        input_data = (input_data / input_scale + input_zero).astype(np.uint8)
    elif input_dtype == np.float32:
        pass  # already float32

    interpreter.set_tensor(input_details[0]["index"], input_data)
    interpreter.invoke()

    output = interpreter.get_tensor(output_details[0]["index"])

    # Extract probability — handle various output shapes
    if output.ndim == 2 and output.shape[1] >= 2:
        # Classification with multiple classes [batch, classes]
        fake_prob = float(output[0][1])  # assume index 1 = "fake"
    elif output.ndim == 2 and output.shape[1] == 1:
        fake_prob = float(output[0][0])
    elif output.ndim == 1:
        fake_prob = float(output[0])
    else:
        # Fallback: take max
        fake_prob = float(np.max(output))

    # Clamp to [0, 1]
    fake_prob = max(0.0, min(1.0, fake_prob))
    score = int(fake_prob * 100)

    return {
        "score": score,
        "raw_output": round(fake_prob, 6),
        "model": "tflite-efficientnet-lite0",
        "is_real": score <= 30,
    }


def is_available() -> bool:
    """Check if TFLite inference is available."""
    return _HAS_TFLITE and MODEL_PATH.exists()
