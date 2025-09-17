import json
import sys
import logging
from extract_text import extract_text_tesseract
from pre_process import preprocess_text
from llm_postprocess import clean_ocr_text, extract_structured_fields

def main():
    logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

    default_path = 'samples/ai_integration.pdf'
    target_path = sys.argv[1] if len(sys.argv) > 1 else default_path

    try:
        raw_text = extract_text_tesseract(target_path)
        rule_cleaned = preprocess_text(raw_text)

        # Optional: LLM cleanup for higher quality
        llm_clean = clean_ocr_text(rule_cleaned)
        cleaned_text = llm_clean.get("cleaned_text", rule_cleaned)

        print(cleaned_text)

        # Optional: structured extraction
        fields = extract_structured_fields(cleaned_text)
        print(json.dumps(fields, indent=2, ensure_ascii=False))

    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
