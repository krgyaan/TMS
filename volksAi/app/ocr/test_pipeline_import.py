"""Regression test for app.ocr.pipeline logger import and Pillow compatibility."""

import importlib
import logging


def test_ocr_pipeline_imports_cleanly():
    pipeline = importlib.import_module("app.ocr.pipeline")
    assert hasattr(pipeline, "classify_document_type")
    assert callable(pipeline.classify_document_type)
    assert isinstance(pipeline.logger, logging.Logger)
    assert pipeline.classify_document_type("GEM/2026/B/1234567") == "gem_structured"
    assert pipeline.classify_document_type("Plain notice text") == "generic_nit"
