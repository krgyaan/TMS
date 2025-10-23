"""
Replace OpenAI API with self-hosted open-source LLM
Options: Llama 3.1, Mistral, Qwen2.5
"""
import json
import logging
from typing import Dict, Any
import requests

logger = logging.getLogger(__name__)

class LocalLLMClient:
    """
    Client for self-hosted LLM via Ollama/vLLM/LocalAI
    Run locally: ollama run llama3.1:8b
    """
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.api_endpoint = f"{base_url}/api/generate"

    def generate(self, prompt: str, model: str = "llama3.1:8b",
                 temperature: float = 0.2, format: str = "json") -> str:
        """Generate response from local LLM"""
        payload = {
            "model": model,
            "prompt": prompt,
            "temperature": temperature,
            "stream": False,
        }
        if format == "json":
            payload["format"] = "json"

        try:
            response = requests.post(self.api_endpoint, json=payload, timeout=120)
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise

def clean_ocr_text_local(
    text: str,
    preserve_case: bool = True,
    keep_hindi: bool = True,
    standardize_tokens: bool = True,
    model: str = "llama3.1:8b",
) -> Dict[str, Any]:
    """
    Clean OCR text using self-hosted LLM (NO external APIs)
    """
    client = LocalLLMClient()

    prompt = f"""You are an OCR text cleaner. Clean the following text with these requirements:
- Preserve original meaning and wording
- Fix spacing, broken words, and punctuation
- Fix common OCR errors (0/O confusion, rn/m, broken quotes)
- Merge soft-wrapped lines and hyphenated words
- Remove recurring headers/footers if clearly identified
- Keep Hindi Devanagari text as-is
- Standardize dates to yyyy-mm-dd format where clear
- Standardize currency to 'INR <amount>'
- Normalize percent spacing (e.g., '50%')

Return ONLY a JSON object with these keys:
- cleaned_text: the cleaned text
- notes: array of what was fixed
- removed_lines: array of removed header/footer lines
- stats: object with counts

Input text:
{text}

Output JSON:"""

    try:
        response = client.generate(prompt, model=model, temperature=0.1, format="json")
        return json.loads(response)
    except json.JSONDecodeError:
        logger.warning("Model did not return valid JSON")
        return {"cleaned_text": text, "notes": ["Parsing failed, returning original"]}

def extract_structured_fields_local(
    text: str,
    model: str = "llama3.1:8b",
) -> Dict[str, Any]:
    """
    Extract structured tender fields using self-hosted LLM
    """
    client = LocalLLMClient()

    schema_example = {
        "document_type": "tender",
        "title": "Supply of Laboratory Equipment",
        "buyer": "AIIMS Delhi",
        "tender_id": "AIIMS/PUR/2024/123",
        "publication_date": "2024-01-15",
        "submission_deadline": "2024-02-15",
        "estimated_value_inr": 5000000.0,
        "currency": "INR",
        "contact": "Dr. Sharma (procurement@aiims.edu)",
        "address": "AIIMS, Ansari Nagar, New Delhi",
        "items": [
            {
                "description": "Laboratory Centrifuge",
                "quantity": 5,
                "unit": "pieces",
                "specs": "Min 5000 RPM, refrigerated"
            }
        ],
        "notes": "EMD: 2% of tender value",
        "confidence": 0.9
    }

    prompt = f"""Extract tender information from the following OCR text.
Only use facts present in the text - do not invent values.
If uncertain, use null for that field.

Expected JSON structure (example):
{json.dumps(schema_example, indent=2)}

Input text:
{text}

Extract and return ONLY valid JSON:"""

    try:
        response = client.generate(prompt, model=model, temperature=0.0, format="json")
        return json.loads(response)
    except json.JSONDecodeError:
        logger.warning("Failed to parse structured fields")
        return {"document_type": "unknown", "confidence": 0.0}
