"""services/__init__.py - Export all OCR services"""
from .preprocessing import ImagePreprocessor
from .tesseract_ocr import TesseractOCR
from .voting_system import VotingSystem
from .postprocessing import PostProcessor
from .fix_ocr_errors import OCRErrorFixer 

# Traditional OCR Engines
EASYOCR_AVAILABLE = False
EasyOCREngine = None

try:
    from .easy_ocr import EasyOCREngine
    EASYOCR_AVAILABLE = True
    print("✅ EasyOCR: Available")
except ImportError:
    print("❌ EasyOCR: Not available")

PADDLEOCR_AVAILABLE = False
PaddleOCREngine = None

try:
    import paddle
    from .paddle_ocr import PaddleOCREngine
    PADDLEOCR_AVAILABLE = True
    print("✅ PaddleOCR: Available")
except ImportError:
    print("❌ PaddleOCR: Not available")

__all__ = [
    "ImagePreprocessor",
    "TesseractOCR",
    "EasyOCREngine",
    "PaddleOCREngine",
    "VotingSystem",
    "PostProcessor",
    "OCRErrorFixer",
    "EASYOCR_AVAILABLE",
    "PADDLEOCR_AVAILABLE"
]

print("✅ Tesseract: Available")
print("✅ OCR Error Fixer: Available") 