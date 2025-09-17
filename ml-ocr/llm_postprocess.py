import os
import json
import logging
from typing import Dict, Any, Optional
from openai import OpenAI
from CONSTANTS import OPENAI_API_KEY

os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY

logger = logging.getLogger(__name__)
_client: Optional[OpenAI] = None

def get_client() -> OpenAI:
    global _client
    if _client is None:
        if not os.getenv("OPENAI_API_KEY"):
            raise RuntimeError("OPENAI_API_KEY not set")
        _client = OpenAI()
    return _client

def _chat_json(messages, model="gpt-4o-mini", temperature=0.2, max_tokens=2000) -> Dict[str, Any]:
    client = get_client()
    resp = client.chat.completions.create(
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=messages,
        max_tokens=max_tokens,
    )
    content = resp.choices[0].message.content or "{}"
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logger.warning("Model did not return valid JSON; returning raw text")
        return {"cleaned_text": content}

def clean_ocr_text(
    text: str,
    preserve_case: bool = True,
    keep_hindi: bool = True,
    standardize_tokens: bool = True,
    model: str = "gpt-4o-mini",
) -> Dict[str, Any]:
    """
    Return JSON with:
      - cleaned_text: str
      - notes: list[str] (what was fixed)
      - removed_lines: list[str]
      - stats: dict
    """
    system = (
        "You clean OCR'd text with minimal hallucination. "
        "Preserve meaning and wording; fix spacing, broken words, punctuation, "
        "and common OCR errors (0/O, rn/m, E&M, quotes, dashes). "
        "Merge soft-wrapped lines and hyphenated words across line breaks. "
        "Remove recurring headers/footers if confidently identified. "
        "If bilingual (English + Hindi Devanagari), keep Hindi as-is; do not romanize."
    )
    user = {
        "text": text,
        "requirements": {
            "preserve_case": preserve_case,
            "keep_hindi": keep_hindi,
            "standardize_tokens": standardize_tokens,
            "standardizations": [
                "Dates to ISO yyyy-mm-dd where unambiguous",
                "Currency to 'INR <amount>'",
                "Percent spacing normalized (e.g., '50%')",
            ],
        },
        "output_format": {
            "type": "object",
            "properties": {
                "cleaned_text": {"type": "string"},
                "notes": {"type": "array", "items": {"type": "string"}},
                "removed_lines": {"type": "array", "items": {"type": "string"}},
                "stats": {"type": "object"},
            },
            "required": ["cleaned_text"],
        },
    }
    messages = [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": (
                "Clean and normalize this OCR text. Return a JSON object with keys "
                "'cleaned_text', 'notes', 'removed_lines', and 'stats'.\n\n"
                + json.dumps(user, ensure_ascii=False)
            ),
        },
    ]
    return _chat_json(messages, model=model, temperature=0.1)

def extract_structured_fields(
    text: str,
    model: str = "gpt-4o-mini",
) -> Dict[str, Any]:
    """
    Extracts a tender-like schema. Adjust fields as needed.
    """
    schema = {
        "type": "object",
        "properties": {
            "document_type": {"type": "string", "enum": ["tender", "unknown"]},
            "title": {"type": "string"},
            "buyer": {"type": "string"},
            "tender_id": {"type": "string"},
            "publication_date": {"type": "string", "description": "yyyy-mm-dd if present"},
            "submission_deadline": {"type": "string", "description": "yyyy-mm-dd if present"},
            "estimated_value_inr": {"type": "number"},
            "currency": {"type": "string", "default": "INR"},
            "contact": {"type": "string"},
            "address": {"type": "string"},
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "description": {"type": "string"},
                        "quantity": {"type": "number"},
                        "unit": {"type": "string"},
                        "specs": {"type": "string"},
                    },
                },
            },
            "notes": {"type": "string"},
            "confidence": {"type": "number"},
        },
        "required": ["document_type"],
    }

    system = (
        "You are a precise information extractor. "
        "Only use facts in the text; do not invent values. "
        "If you are unsure, return null for that field."
    )
    prompt = {
        "instruction": "Extract the following fields from the OCR text. Return JSON only.",
        "schema": schema,
        "text": text,
    }
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
    ]
    return _chat_json(messages, model=model, temperature=0.0)
