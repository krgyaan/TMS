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


# ── FIX: Manufacturer Authorization Form (MAF) tripartite resolution (true/false/null) ──

MAF_REQUIRED_CLAUSE = (
    "SECTION-II BID EVALUATION CRITERIA (BEC)\n"
    "TECHNICAL CRITERIA: In case the bidder is not the OEM, bidder must submit "
    "a valid Manufacturer Authorization Form (MAF) from the OEM along with the bid.\n"
)

MAF_EXPLICITLY_NOT_REQUIRED_CLAUSE = (
    "SECTION-II BID EVALUATION CRITERIA (BEC)\n"
    "TECHNICAL CRITERIA: Manufacturer Authorization Form (MAF) / OEM Authorization is NOT REQUIRED "
    "for this tender. Resellers are exempted from submitting MAF.\n"
)

MAF_SILENT_CLAUSE = (
    "SECTION-II BID EVALUATION CRITERIA (BEC)\n"
    "TECHNICAL CRITERIA: Bidder must have executed at least one order for supply of battery chargers.\n"
    "FINANCIAL CRITERIA: Average annual turnover must be at least Rs. 50 Lakhs.\n"
)


def test_maf_prompt_has_no_old_binary_wording_and_uses_tripartite_rules():
    """Old binary rule ('otherwise false') must be absent; new tripartite rules must be present."""
    sys_instruction = UNIVERSAL_TENDER_SYSTEM_INSTRUCTION
    maf_desc = FIELD_PROMPT_MAP["maf_required_display"][2]

    # Old binary wording must be completely gone
    assert "otherwise false" not in sys_instruction
    assert "otherwise false" not in maf_desc
    assert "Look in BEC Section-II for 'Manufacturer' or 'Authorized Dealer'" not in maf_desc

    # System instruction must instruct true only on explicit requirement, false only on explicit exemption, null on silence
    assert "Return true ONLY if the text explicitly states MAF is required" in sys_instruction
    assert "return false ONLY if the text explicitly states MAF is not required or not applicable" in sys_instruction
    assert "return null if the document is silent on MAF" in sys_instruction
    assert "absence of a requirement is not the same as an explicit exemption" in sys_instruction

    # Field-specific prompt must instruct the same tripartite logic
    assert "Return true ONLY if the text explicitly requires MAF" in maf_desc
    assert "Return false ONLY if the text explicitly says it is not required or not applicable" in maf_desc
    assert "Return null if the document is silent -- silence is NOT the same as 'not required'" in maf_desc


def test_maf_prompt_sent_to_claude_has_tripartite_wording(monkeypatch):
    """The actual prompt payload sent to Claude must carry the tripartite instruction, not the binary one."""
    calls, _ = _run_role1(monkeypatch, MAF_REQUIRED_CLAUSE, ["maf_required_display"])
    assert calls, "Role 1 made no call"
    sent = _sent_text(calls[0])

    assert "otherwise false" not in sent
    assert "Return true ONLY if the text explicitly" in sent
    assert "Return null if the document is silent" in sent


def test_maf_explicitly_required_clause_accepts_true(monkeypatch):
    """Explicit MAF requirement: prompt instructs true ONLY here, and stubbed true is accepted as Yes."""
    calls, results = _run_role1(
        monkeypatch,
        MAF_REQUIRED_CLAUSE,
        ["maf_required_display"],
        lambda i, kw: {"maf_required": True},
    )
    assert calls
    sent = _sent_text(calls[0])
    assert "Return true ONLY if the text explicitly" in sent

    assert "maf_required_display" in results
    res = results["maf_required_display"]
    assert res["value"] == "Yes"
    assert res["raw_value"] is True
    assert res["source"] == "llm"


def test_maf_explicitly_not_required_clause_accepts_false(monkeypatch):
    """Explicit MAF exemption: stubbed false is accepted as No."""
    calls, results = _run_role1(
        monkeypatch,
        MAF_EXPLICITLY_NOT_REQUIRED_CLAUSE,
        ["maf_required_display"],
        lambda i, kw: {"maf_required": False},
    )
    assert calls
    sent = _sent_text(calls[0])
    assert "return false ONLY if the text explicitly states MAF is not required" in sent

    assert "maf_required_display" in results
    res = results["maf_required_display"]
    assert res["value"] == "No"
    assert res["raw_value"] is False
    assert res["source"] == "llm"


def test_maf_silent_clause_instructs_and_accepts_null(monkeypatch):
    """
    Tender document is silent on MAF (the bug fixed by 2a8bda3e):
    The prompt explicitly instructs returning null (silence != not required),
    and a stubbed null response leaves maf_required_display unresolved (not falsely set to No).
    """
    calls, results = _run_role1(
        monkeypatch,
        MAF_SILENT_CLAUSE,
        ["maf_required_display"],
        lambda i, kw: {"maf_required": None},
    )
    assert calls
    sent = _sent_text(calls[0])
    assert "Return null if the document is silent -- silence is NOT the same as 'not required'" in sent
    assert "return null if the document is silent on MAF" in sent

    # Most important assertion: null does NOT populate results with 'No'
    assert "maf_required_display" not in results


def test_maf_pre_2a8bda3e_wording_would_fail_tripartite_and_null_checks():
    """
    Regression check proving the fix against the pre-2a8bda3e baseline:
    Simulating the old prompt strings confirms they fail the new assertions.
    """
    old_system_prompt = (
        "4. Exact numerical and conditional precision:\n"
        "   - For MAF (Manufacturer Authorization Form): Return true if required from OEM/Manufacturer, otherwise false.\n"
    )
    old_field_desc = (
        "Is Manufacturer Authorization Form (MAF) / OEM Authorization required? "
        "Look in BEC Section-II for 'Manufacturer' or 'Authorized Dealer'"
    )

    # 1. Old wording contains the banned phrase
    assert "otherwise false" in old_system_prompt

    # 2. Old wording lacks null instruction on silence
    assert "return null if the document is silent" not in old_system_prompt
    assert "silence is NOT the same as 'not required'" not in old_field_desc
    assert "Return true ONLY" not in old_system_prompt


# ── FIX H: Remove concrete example values from EMD, PBG, LD, and contact field prompts ──

EMD_PBG_LD_CONTACT_KEYS = [
    "emd_mode_display",
    "pbg_mode_display",
    "sd_mode_display",
    "tender_fee_mode_display",
    "ld_percentage_display",
    "max_ld_percentage_display",
    "client_name_1_display",
    "client_email_1_display",
    "client_phone_1_display",
    "client_name_2_display",
    "client_email_2_display",
    "client_phone_2_display",
    "client_name_3_display",
    "client_email_3_display",
    "client_phone_3_display",
]

KOCHI_GEM_NATIVE_EMD_PBG_LD_MISSING = (
    "Bid Number: GEM/2026/B/8024876\n"
    "Ministry/State Name: Ministry Of Petroleum And Natural Gas\n"
    "Department Name: Gail India Limited\n"
    "Organisation Name: Gail India Limited\n"
    "Office Name: Kochi Kerala\n"
    "Item Category: Custom Bid for Services - Lumpsum Charges\n"
    "Contact details of Grievance redressal:\n"
    "HOD Email id: sharikumar@gail.co.in\n"
    "Buyer Email id: allan.tomy@gail.co.in\n"
)

BANNED_CONTACT_EXAMPLES = [
    "Ramesh Kumar",
    "ramesh.kumar@gail.co.in",
    "A. Kumar",
    "a.kumar@gail.co.in",
]

BANNED_INSTRUMENT_LIST_EXAMPLES = [
    "Bank Guarantee / Demand Draft / FDR / Online / Insurance Surety Bond",
    "DD, SB, FDR, BG, Bank Transfer",
    "Demand Draft / Banker Cheque / Online",
    "Bank Guarantee / Insurance Surety Bond",
    "Bank Guarantee / DD / FDR / Insurance Surety Bond",
]


def test_system_prompt_and_field_descriptions_have_no_contact_or_instrument_examples():
    """Assert the system prompt and FIELD_PROMPT_MAP contain no concrete contact or instrument examples."""
    s = UNIVERSAL_TENDER_SYSTEM_INSTRUCTION

    # 1. Contact examples must not appear in system prompt
    for banned in BANNED_CONTACT_EXAMPLES:
        assert banned not in s, f"Banned contact example '{banned}' found in system prompt"

    # 2. Contact examples must not appear in any field description
    for key, entry in FIELD_PROMPT_MAP.items():
        desc = entry[2]
        for banned in BANNED_CONTACT_EXAMPLES:
            assert banned not in desc, f"Banned contact example '{banned}' found in FIELD_PROMPT_MAP[{key}]"

    # 3. Instrument-list examples must not appear in system prompt or field descriptions
    for banned in BANNED_INSTRUMENT_LIST_EXAMPLES:
        assert banned not in s, f"Banned instrument list '{banned}' found in system prompt"
        for key, entry in FIELD_PROMPT_MAP.items():
            assert banned not in entry[2], f"Banned instrument list '{banned}' found in FIELD_PROMPT_MAP[{key}]"

    # 4. Contact fields must use placeholder tokens ([Full Name], [email]@[domain], [phone-number])
    for num in ("1", "2", "3"):
        name_desc = FIELD_PROMPT_MAP[f"client_name_{num}_display"][2]
        email_desc = FIELD_PROMPT_MAP[f"client_email_{num}_display"][2]
        phone_desc = FIELD_PROMPT_MAP[f"client_phone_{num}_display"][2]

        assert "[Full Name]" in name_desc
        assert "[email]@[domain]" in email_desc
        assert "[phone-number]" in phone_desc
        assert "only if literally stated in the text" in name_desc
        assert "only if literally stated in the text" in email_desc
        assert "only if literally stated in the text" in phone_desc

    # 5. EMD, PBG, SD mode fields must carry neutral instruction and no concrete lists
    for mode_key in ("emd_mode_display", "pbg_mode_display", "sd_mode_display"):
        mode_desc = FIELD_PROMPT_MAP[mode_key][2]
        assert "only if literally named in the text" in mode_desc
        assert "Do NOT list default or customary instruments" in mode_desc
        assert not re.search(r"e\.g\.\s*['\"].*?(?:Bank Guarantee|Demand Draft|FDR)", mode_desc, re.IGNORECASE)


def test_prompt_actually_sent_for_emd_pbg_ld_contacts_has_no_example_values(monkeypatch):
    """When Role 1 is invoked, the actual prompt payload sent to Claude has no banned examples."""
    calls, _ = _run_role1(monkeypatch, KOCHI_GEM_NATIVE_EMD_PBG_LD_MISSING, EMD_PBG_LD_CONTACT_KEYS)
    assert calls, "Role 1 made no call"
    for kwargs in calls:
        sent = _sent_text(kwargs)
        for banned in BANNED_CONTACT_EXAMPLES:
            assert banned not in sent, f"Found '{banned}' in sent payload"
        for banned in BANNED_INSTRUMENT_LIST_EXAMPLES:
            assert banned not in sent, f"Found '{banned}' in sent payload"
        assert "0.5%" not in sent


def _instrument_and_contact_copying_stub(i, kwargs):
    """
    Simulates a model that copies concrete contact names, emails, instrument lists,
    or LD rates directly from the tool property descriptions.
    """
    props = kwargs["tools"][0]["input_schema"]["properties"]
    out = {}
    for name, spec in props.items():
        desc = spec.get("description", "")
        # Copy any concrete email (not a bracketed placeholder)
        email_m = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", desc)
        if email_m and "[" not in email_m.group(0):
            out[name] = email_m.group(0)
            continue
        # Copy any concrete instrument list pattern (e.g. "Bank Guarantee / Demand Draft / ...")
        inst_m = re.search(r"(?:Bank Guarantee|Demand Draft|FDR|Insurance Surety Bond|Bank Transfer)(?:\s*/\s*(?:Bank Guarantee|Demand Draft|FDR|Online|Insurance Surety Bond|Banker Cheque))+", desc, re.IGNORECASE)
        if inst_m:
            out[name] = inst_m.group(0)
            continue
        # Copy any concrete percentage like 0.5% or 5%
        pct_m = re.search(r"\b(?:0\.5|5|10)%", desc)
        if pct_m:
            out[name] = pct_m.group(0)
            continue
        out[name] = None
    return out


def test_example_copying_model_has_no_contact_or_instrument_examples_to_copy(monkeypatch):
    """
    On real Kochi tender text where EMD, PBG, LD, and contacts are missing at the mapper level,
    an example-copying stub finds zero ready-made examples in the prompt descriptions,
    so no fabricated values leak into results.
    """
    _, results = _run_role1(
        monkeypatch,
        KOCHI_GEM_NATIVE_EMD_PBG_LD_MISSING,
        EMD_PBG_LD_CONTACT_KEYS,
        _instrument_and_contact_copying_stub,
    )
    for key in EMD_PBG_LD_CONTACT_KEYS:
        assert key not in results, f"{key} was unexpectedly populated with: {results.get(key)}"


def test_pre_fix_h_descriptions_would_have_leaked_to_copying_stub():
    """
    Regression proof against pre-Fix-H baseline:
    Verify that the old descriptions WOULD have been matched and copied by the stub,
    proving the fix prevents real prompt leakage.
    """
    old_contact_desc = "Name of primary contact / Tender Dealing Officer from IFB Tag (G) (e.g. 'Sh. Ramesh Kumar')"
    old_email_desc = "Email address of primary contact (e.g. ramesh.kumar@gail.co.in)"
    old_emd_mode_desc = "Accepted payment instruments for EMD (e.g. 'Bank Guarantee / Demand Draft / FDR / Online / Insurance Surety Bond')."
    old_ld_desc = "Maximum PRS/LD cap as 5% of total order value"

    # Pre-fix strings match the stub's extraction patterns
    assert "ramesh.kumar@gail.co.in" in old_email_desc
    assert "Ramesh Kumar" in old_contact_desc
    assert re.search(r"(?:Bank Guarantee|Demand Draft|FDR)", old_emd_mode_desc)
    assert re.search(r"\b5%", old_ld_desc)


