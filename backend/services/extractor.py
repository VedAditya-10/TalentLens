import io
import logging

import pdfplumber
from docx import Document

logger = logging.getLogger(__name__)

# If pdfplumber returns less than this many characters across the whole PDF,
# we assume the PDF is scanned (image-only) and fall back to OCR.
OCR_FALLBACK_CHAR_THRESHOLD = 50
# Resolution for rasterizing pages before OCR. 200 DPI is a good speed/accuracy
# tradeoff for typical 8.5x11 / A4 resumes.
OCR_DPI = 200
# Cap OCR on very long PDFs to keep latency bounded. If a resume is somehow
# longer than this many pages, we only OCR the first N pages.
OCR_MAX_PAGES = 20


def _configure_tesseract(pytesseract_module):
    """
    Configure pytesseract path on Windows if the standard installation exists.
    """
    import os
    default_win_tesseract = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.name == "nt" and os.path.exists(default_win_tesseract):
        pytesseract_module.pytesseract.tesseract_cmd = default_win_tesseract


def _ocr_pdf_pages(file_bytes: bytes) -> str:
    """
    Rasterize each page of a PDF and run Tesseract OCR on it.
    Returns the concatenated text across pages.

    Raises ImportError if pytesseract/pdf2image aren't installed.
    Raises RuntimeError if the Tesseract binary is missing.
    """
    # Lazy imports so the module is importable even when OCR deps are not
    # installed locally (e.g. developer running backend outside Docker).
    try:
        import pytesseract  # type: ignore
        from pdf2image import convert_from_bytes  # type: ignore
    except ImportError as e:
        raise ImportError(
            "OCR dependencies (pytesseract, pdf2image) are not installed. "
            "Install them with: pip install pytesseract pdf2image Pillow"
        ) from e

    _configure_tesseract(pytesseract)

    try:
        images = convert_from_bytes(file_bytes, dpi=OCR_DPI, last_page=OCR_MAX_PAGES)
    except Exception as e:
        # convert_from_bytes raises various exceptions depending on the cause
        # (missing poppler, corrupted PDF, password-protected, etc.).
        raise RuntimeError(f"Failed to rasterize PDF for OCR: {e}") from e

    text_parts: list[str] = []
    for i, img in enumerate(images, start=1):
        try:
            page_text = pytesseract.image_to_string(img)
        except pytesseract.TesseractNotFoundError as e:
            raise RuntimeError(
                "Tesseract binary not found on PATH. Install it with "
                "`apt-get install tesseract-ocr` (Linux), "
                "`brew install tesseract` (macOS), or the Windows installer "
                "from https://github.com/UB-Mannheim/tesseract/wiki."
            ) from e
        if page_text and page_text.strip():
            text_parts.append(page_text)

    if not text_parts:
        logger.warning("OCR ran on PDF but produced no text on any page")
    else:
        logger.info(f"OCR extracted text from {len(text_parts)} page(s)")

    return "\n".join(text_parts)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text from a PDF. Tries pdfplumber first (fast, accurate for
    text-based PDFs). If the result is empty or suspiciously short, falls
    back to Tesseract OCR for scanned/image-based PDFs.
    """
    text_parts: list[str] = []
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception as e:
        # Corrupted or password-protected PDF, etc. Don't fail outright —
        # OCR might still recover something.
        logger.warning(f"pdfplumber failed to read PDF ({e}); will try OCR")
        text_parts = []

    combined = "\n".join(text_parts).strip()

    if len(combined) >= OCR_FALLBACK_CHAR_THRESHOLD:
        return combined

    logger.info(
        f"PDF text extraction returned only {len(combined)} chars "
        f"(threshold={OCR_FALLBACK_CHAR_THRESHOLD}); falling back to OCR"
    )
    return _ocr_pdf_pages(file_bytes)


def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def extract_text_from_image(file_bytes: bytes) -> str:
    """
    Extract text from a resume image (PNG, JPG, JPEG) using Tesseract OCR.
    """
    try:
        from PIL import Image
        import pytesseract
    except ImportError as e:
        raise ImportError(
            "OCR dependencies (pytesseract, Pillow) are not installed. "
            "Install them with: pip install pytesseract Pillow"
        ) from e

    _configure_tesseract(pytesseract)

    try:
        img = Image.open(io.BytesIO(file_bytes))
    except Exception as e:
        raise RuntimeError(f"Failed to open image for OCR: {e}") from e

    try:
        page_text = pytesseract.image_to_string(img)
    except pytesseract.TesseractNotFoundError as e:
        raise RuntimeError(
            "Tesseract binary not found on PATH. Install it with "
            "`apt-get install tesseract-ocr` (Linux), "
            "`brew install tesseract` (macOS), or the Windows installer "
            "from https://github.com/UB-Mannheim/tesseract/wiki."
        ) from e
    except Exception as e:
        raise RuntimeError(f"Tesseract OCR failed on image: {e}") from e

    return page_text


def extract_text(filename: str, file_bytes: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    elif lower.endswith(".docx"):
        return extract_text_from_docx(file_bytes)
    elif lower.endswith((".png", ".jpg", ".jpeg")):
        return extract_text_from_image(file_bytes)
    else:
        raise ValueError(
            f"Unsupported file type: {filename}. Only PDF, DOCX, PNG, JPG, and JPEG are accepted."
        )
