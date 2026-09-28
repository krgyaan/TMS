"""
Role 1 prompt hygiene: example values in the prompt must not look like real
tender data, because the model copies them into output (confirmed live: Noida's
order_value_1 came back as "Rs. 61.00 Lac", the prompt's own example).

Every test inspects the prompt text that is actually sent to Claude, captured
from a fake Anthropic client. No live API calls; _save_memory is patched so the
on-disk extraction memory file is never written.
"""
import json
import re
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.services import llm_field_resolver as lfr
from app.services.llm_field_resolver import (
    FIELD_PROMPT_MAP,
    UNIVERSAL_TENDER_SYSTEM_INSTRUCTION,
    LLMFieldResolver,
)


class _FakeMessages:
    def __init__(self, tool_input_by_call):
        self.calls = []
        self._tool_input_by_call = tool_input_by_call

    def create(self, **kwargs):
        self.calls.append(kwargs)
        idx = len(self.calls) - 1
        tool_input = self._tool_input_by_call(idx, kwargs)
        return SimpleNamespace(
            content=[SimpleNamespace(type="tool_use", name="extract_missing_fields", input=tool_input)],
            usage=SimpleNamespace(input_tokens=100, output_tokens=10,
                                  cache_creation_input_tokens=0, cache_read_input_tokens=0),
            stop_reason="tool_use",
        )


def _run_role1(monkeypatch, text, fields, tool_input_by_call=lambda i, kw: {}):
    monkeypatch.setenv("LLM_FALLBACK_ENABLED", "true")
    resolver = LLMFieldResolver(api_key="test-key-not-real")
    fake = _FakeMessages(tool_input_by_call)
    resolver.client = SimpleNamespace(messages=fake)
    with patch.object(lfr, "_save_memory"):
        results = resolver.resolve_missing_fields(text, fields)
    return fake.calls, results


def _sent_text(call_kwargs):
    system = "".join(block["text"] for block in call_kwargs["system"])
    tools = json.dumps(call_kwargs["tools"], ensure_ascii=False)
    user = "".join(m["content"] for m in call_kwargs["messages"])
    return system + "\n" + tools + "\n" + user


LD_PBG_PAYMENT_KEYS = [
    "payment_terms_supply_display",
    "payment_terms_installation_display",
    "ld_percentage_display",
    "max_ld_percentage_display",
    "sd_percentage_display",
    "sd_duration_display",
    "pbg_percentage_display",
    "pbg_duration_display",
]

GENERIC_CLAUSE = (
    "SPECIAL CONDITIONS OF CONTRACT\n"
    "Clause 39: CONTRACT PERFORMANCE SECURITY / SECURITY DEPOSIT shall be furnished by the successful bidder.\n"
    "PRICE REDUCTION SCHEDULE (PRS) shall apply for delayed delivery as per GCC.\n"
    "Terms of Payment: as per GCC-Goods.\n"
)


# ── FIX 3: LD, PBG/SD, payment terms ────────────────────────────────────────

def test_system_prompt_has_no_concrete_ld_example_values():
    for banned in ("0.5%", "10.0%", "5.0%", "e.g. 0.5", "(e.g. 5.0", "maximum of 10%"):
        assert banned not in UNIVERSAL_TENDER_SYSTEM_INSTRUCTION, banned


def test_system_prompt_has_no_concrete_pbg_or_payment_example_values():
    s = UNIVERSAL_TENDER_SYSTEM_INSTRUCTION
    for banned in ("3%, 5%, 10%", "typically 3-10%", "PBG) of 3%", "63 months", "e.g. 70, 80", "e.g. 30, 20",
                   "70% payment against supply", "10% on warranty completion", "e.g. 5 for"):
        assert banned not in s, banned


def test_numerical_precision_uses_placeholders_and_literal_only_rule():
    s = UNIVERSAL_TENDER_SYSTEM_INSTRUCTION
    assert '"X% per week"' in s and '"Y% cap"' in s
    assert s.count("only if literally stated in the text") >= 3
    assert "never fill them with a typical, customary, or default rate" in s


@pytest.mark.parametrize("key", LD_PBG_PAYMENT_KEYS)
def test_ld_pbg_sd_payment_field_descriptions_contain_no_example_numbers(key):
    desc = FIELD_PROMPT_MAP[key][2]
    assert not re.search(r"\d", desc), f"{key} description still carries a concrete number: {desc!r}"
    assert "only if literally stated in the text" in desc


def test_prompt_actually_sent_for_ld_pbg_payment_has_no_default_values(monkeypatch):
    calls, _ = _run_role1(monkeypatch, GENERIC_CLAUSE, LD_PBG_PAYMENT_KEYS)
    assert calls, "Role 1 made no (fake) call"
    for kwargs in calls:
        sent = _sent_text(kwargs)
        for banned in ("0.5%", "10.0%", "e.g. 0.5", "e.g. 5.0", "e.g. 70, 80, 85", "e.g. 30, 20, 15", "e.g. 30)"):
            assert banned not in sent, (banned, kwargs["messages"][0]["content"][:200])


def test_clause_without_numbers_yields_no_ld_pbg_payment_values(monkeypatch):
    """Stubbed model follows the prompt and returns null: nothing is filled in downstream."""
    null_input = {FIELD_PROMPT_MAP[k][0]: None for k in LD_PBG_PAYMENT_KEYS}
    _, results = _run_role1(monkeypatch, GENERIC_CLAUSE, LD_PBG_PAYMENT_KEYS, lambda i, kw: dict(null_input))
    assert not any(k in results for k in LD_PBG_PAYMENT_KEYS)


# ── FIX 4: BEC order values, turnover, net worth, working capital, solvency ─

BEC_VALUE_KEYS = [
    "order_value_1_display",
    "order_value_2_display",
    "order_value_3_display",
    "avg_annual_turnover_value_display",
    "working_capital_value_display",
    "net_worth_value_display",
    "solvency_certificate_value_display",
]

# A concrete money figure written with an Indian unit, e.g. "61.00 Lac", "62.14 Lakhs", "500 Crore".
CONCRETE_LAKH_CRORE = re.compile(r"\d[\d,.]*\s*(?:lakhs?|lacs?|crores?|cr)\b", re.IGNORECASE)

# Real GeM boilerplate (seen on Vadodra): an EMD-exemption turnover threshold,
# with no general BEC turnover clause anywhere in the text.
EMD_EXEMPTION_ONLY_CLAUSE = (
    "SECTION-II BID EVALUATION CRITERIA (BEC)\n"
    "A. TECHNICAL CRITERIA: Bidder must have executed at least one order for supply of battery chargers.\n"
    "EMD EXEMPTION: The following categories of sellers are exempted from submission of EMD:\n"
    "(iv) Sellers who have got their credentials verified through Vendor Assessment.\n"
    "(v) Sellers/ Service Provider having annual turnover of INR 500 Crore or more, "
    "at least in one of the past three completed financial year(s).\n"
)


def test_illustration_only_rule_is_the_first_line_of_the_system_prompt():
    first_line = UNIVERSAL_TENDER_SYSTEM_INSTRUCTION.splitlines()[0]
    assert first_line.startswith("EXAMPLE VALUES ARE FORMAT ILLUSTRATIONS ONLY")
    assert "never real tender data" in first_line
    assert "must never appear verbatim in your output" in first_line
    assert "treat that as an extraction error" in first_line
    assert "return null" in first_line


def test_system_prompt_has_no_concrete_lakh_crore_examples():
    s = UNIVERSAL_TENDER_SYSTEM_INSTRUCTION
    for banned in ("61.00 Lac", "62.14 Lakhs", "62,14,000", "Rs. 50 Lakhs"):
        assert banned not in s, banned
    assert CONCRETE_LAKH_CRORE.findall(s) == []


def test_no_field_description_carries_a_concrete_lakh_crore_example():
    # The static Role 1 tool schema sends EVERY description on every call, so check them all.
    offenders = {k: CONCRETE_LAKH_CRORE.findall(e[2]) for k, e in FIELD_PROMPT_MAP.items() if CONCRETE_LAKH_CRORE.findall(e[2])}
    assert offenders == {}
    for banned in ("61,00,000", "12,00,000", "12.00 Lac", "50.00 Lac"):
        assert not any(banned in e[2] for e in FIELD_PROMPT_MAP.values()), banned


@pytest.mark.parametrize("key", BEC_VALUE_KEYS)
def test_bec_value_descriptions_use_fake_placeholders(key):
    desc = FIELD_PROMPT_MAP[key][2]
    assert "[X] Lakhs" in desc and "[X] Crore" in desc, desc
    assert "only if literally stated in the text" in desc


def test_clause_purpose_guidance_names_the_exemption_clauses():
    s = UNIVERSAL_TENDER_SYSTEM_INSTRUCTION
    assert "Clause-purpose check for eligibility thresholds" in s
    assert "EMD / bid-security exemption" in s
    assert "MSE / Startup relaxation" in s
    assert "bank-guarantee issuer" in s
    for key in ("avg_annual_turnover_value_display", "net_worth_value_display",
                "working_capital_value_display", "solvency_certificate_value_display"):
        assert "never a figure from an EMD-exemption" in FIELD_PROMPT_MAP[key][2], key


def test_prompt_actually_sent_for_bec_fields_has_rule_first_and_no_example_figures(monkeypatch):
    calls, _ = _run_role1(monkeypatch, EMD_EXEMPTION_ONLY_CLAUSE, BEC_VALUE_KEYS)
    assert calls
    for kwargs in calls:
        system_text = "".join(block["text"] for block in kwargs["system"])
        assert system_text.startswith("EXAMPLE VALUES ARE FORMAT ILLUSTRATIONS ONLY")
        prompt_only = system_text + json.dumps(kwargs["tools"], ensure_ascii=False)
        assert CONCRETE_LAKH_CRORE.findall(prompt_only) == []  # scoped clause text excluded on purpose


def _example_copying_stub(i, kwargs):
    """
    Reproduces the failure seen on Noida: the model returned order_value_1's own
    prompt example. This stub does exactly that -- it answers each field with the
    first concrete Lakh/Crore example in that field's description, or null.
    """
    props = kwargs["tools"][0]["input_schema"]["properties"]
    out = {}
    for name, spec in props.items():
        m = re.search(r"(?:Rs\.?\s*|₹)?\d[\d,.]*\s*(?:lakhs?|lacs?|crores?|cr)\b", spec.get("description", ""), re.IGNORECASE)
        out[name] = m.group(0) if m else None
    return out


def test_example_copying_model_has_nothing_to_copy(monkeypatch):
    _, results = _run_role1(monkeypatch, EMD_EXEMPTION_ONLY_CLAUSE, BEC_VALUE_KEYS, _example_copying_stub)
    assert "order_value_1_display" not in results  # previously came back as "Rs. 61.00 Lac"
    assert not any(k in results for k in BEC_VALUE_KEYS), results


def test_emd_exemption_turnover_clause_is_flagged_to_the_model_not_offered_as_the_answer(monkeypatch):
    """
    The EMD-exemption figure reaches the model as scoped context, alongside explicit
    guidance that such a figure is not the BEC turnover. A stub that follows the
    prompt returns null, and nothing is merged. (A stub cannot prove a real model
    complies; that needs a live evaluation, which this suite deliberately avoids.)
    """
    keys = ["avg_annual_turnover_value_display", "avg_annual_turnover_type_display"]
    calls, results = _run_role1(
        monkeypatch, EMD_EXEMPTION_ONLY_CLAUSE, keys,
        lambda i, kw: {FIELD_PROMPT_MAP[k][0]: None for k in keys},
    )
    assert calls
    sent = _sent_text(calls[0])
    assert "annual turnover of INR 500 Crore or more" in sent  # the trap is in the scoped context
    assert "exempted from EMD" in sent                          # and so is the evidence it is an exemption
    system_text = "".join(block["text"] for block in calls[0]["system"])
    assert "sellers having annual turnover of INR [X] Crore or more ... are exempted from EMD" in system_text
    turnover_desc = FIELD_PROMPT_MAP["avg_annual_turnover_value_display"][2]
    assert "never a figure from an EMD-exemption" in turnover_desc
    assert "500 Crore" not in system_text and "500 Crore" not in turnover_desc  # not suggested by the prompt itself
    assert "avg_annual_turnover_value_display" not in results
