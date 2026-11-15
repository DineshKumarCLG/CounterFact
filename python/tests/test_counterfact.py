"""
Unit and integration tests for CounterFact Python LangGraph engine.
"""

import pytest
from counterfact.models import (
    Domain,
    PlannerOutput,
    SpecialistFinding,
    GuardResult,
    SynthesisOutput,
    Contradiction,
    CascadeOutput,
    ScenarioPath,
    KeyMilestone,
    TippingPoint,
    Stakeholder,
    StakeholderDebateOutput,
    SimulationState,
)
from counterfact.config import get_default_config, ProviderConfig
from counterfact.eval.evaluate import evaluate_simulation, EvaluationMetrics


def test_models_validation():
    planner = PlannerOutput(
        scenario_summary="Rome never fell scenario",
        departure_point="AD 476",
        domain_weights={"MILITARY": 0.9, "ECONOMIC": 0.8},
        active_agents=[Domain.MILITARY, Domain.ECONOMIC],
        baseline_data_required=["Pax Romana history"],
        clarification_questions=[],
    )
    assert planner.departure_point == "AD 476"
    assert len(planner.active_agents) == 2
    assert Domain.MILITARY in planner.active_agents


def test_guard_result():
    guard = GuardResult(
        domain=Domain.MILITARY,
        passed=True,
        issues=[],
        sanitised=False,
    )
    assert guard.passed is True
    assert guard.domain == Domain.MILITARY


def test_synthesis_and_contradictions():
    synthesis = SynthesisOutput(
        overall_confidence="HIGH",
        unified_analysis="Rome adapted legion structure to industrial machinery.",
        contradictions=[
            Contradiction(
                issue="Manpower vs mechanization",
                viewpoints=["Military historian favors expansion", "Demographer notes urban density"],
                resolution_type="RESOLVED",
                explanation="Auxiliary recruitment shifted to technical maintenance corps.",
            )
        ],
    )
    assert synthesis.overall_confidence == "HIGH"
    assert len(synthesis.contradictions) == 1
    assert synthesis.contradictions[0].resolution_type == "RESOLVED"


def test_evaluation_metrics_computation():
    mock_state = {
        "planner_output": PlannerOutput(
            scenario_summary="Summary",
            departure_point="AD 476",
            domain_weights={"MILITARY": 0.9},
            active_agents=[Domain.MILITARY],
        ),
        "specialist_findings": {
            "MILITARY": SpecialistFinding(
                domain=Domain.MILITARY,
                findings="Legions modernized.",
                key_datapoints=["Legio I expanded", "Ironclad galley commissioned"],
                confidence="HIGH",
            )
        },
        "guard_results": {
            "MILITARY": GuardResult(domain=Domain.MILITARY, passed=True)
        },
        "synthesis": SynthesisOutput(
            overall_confidence="HIGH",
            unified_analysis="Unified synthesis analysis.",
            contradictions=[
                Contradiction(
                    issue="Test",
                    viewpoints=["A", "B"],
                    resolution_type="RESOLVED",
                    explanation="Synthesized",
                )
            ],
        ),
    }

    metrics = evaluate_simulation(mock_state)
    assert isinstance(metrics, EvaluationMetrics)
    assert metrics.grounding_score > 0.0
    assert metrics.causal_validity == 1.0
    assert metrics.contradiction_resolution == 1.0
    assert metrics.overall_score > 0.0
    assert "Simulation evaluated" in metrics.summary


def test_config_defaults(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "ollama")
    monkeypatch.setenv("OLLAMA_MODEL", "llama3.2")
    cfg = get_default_config()
    assert cfg.provider == "ollama"
    assert cfg.model_id == "llama3.2"


def test_byok_config_gemini(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key_12345")
    cfg = get_default_config()
    assert cfg.provider == "gemini"
    assert cfg.api_key == "test_gemini_key_12345"


def test_config_apple_foundation(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "apple")
    cfg = get_default_config()
    assert cfg.provider == "apple"
    assert "apple" in cfg.model_id.lower()


def test_caveman_prompts_compression_ratio():
    from counterfact.agents.planner import PLANNER_SYSTEM_PROMPT, CAVEMAN_PLANNER_SYSTEM_PROMPT
    from counterfact.agents.specialist import SPECIALIST_SYSTEM_PROMPT, CAVEMAN_SPECIALIST_SYSTEM_PROMPT
    from counterfact.agents.guard import GUARD_SYSTEM_PROMPT, CAVEMAN_GUARD_SYSTEM_PROMPT
    from counterfact.agents.synthesis import SYNTHESIS_SYSTEM_PROMPT, CAVEMAN_SYNTHESIS_SYSTEM_PROMPT
    from counterfact.agents.cascade import CASCADE_SYSTEM_PROMPT, CAVEMAN_CASCADE_SYSTEM_PROMPT
    from counterfact.agents.stakeholder import STAKEHOLDER_SYSTEM_PROMPT, CAVEMAN_STAKEHOLDER_SYSTEM_PROMPT

    pairs = [
        (PLANNER_SYSTEM_PROMPT, CAVEMAN_PLANNER_SYSTEM_PROMPT),
        (SPECIALIST_SYSTEM_PROMPT, CAVEMAN_SPECIALIST_SYSTEM_PROMPT),
        (GUARD_SYSTEM_PROMPT, CAVEMAN_GUARD_SYSTEM_PROMPT),
        (SYNTHESIS_SYSTEM_PROMPT, CAVEMAN_SYNTHESIS_SYSTEM_PROMPT),
        (CASCADE_SYSTEM_PROMPT, CAVEMAN_CASCADE_SYSTEM_PROMPT),
        (STAKEHOLDER_SYSTEM_PROMPT, CAVEMAN_STAKEHOLDER_SYSTEM_PROMPT),
    ]

    for orig, cave in pairs:
        assert len(cave) < len(orig), f"Caveman prompt ({len(cave)} chars) not smaller than original ({len(orig)} chars)"
        assert len(cave.split()) < len(orig.split())


def test_apple_chat_model_structured_output():
    from counterfact.llm.client import get_chat_model, AppleFoundationChatModel
    chat = get_chat_model("apple")
    assert isinstance(chat, AppleFoundationChatModel)
    structured = chat.with_structured_output(PlannerOutput)
    assert structured is not None


def test_structured_output_normalization_cascade_and_stakeholder():
    from counterfact.llm.client import StructuredOutputWrapper
    from counterfact.models import CascadeOutput, StakeholderDebateOutput

    # Test CascadeOutput normalization with string lists
    c_wrapper = StructuredOutputWrapper(None, CascadeOutput)
    c_res = c_wrapper._parse_and_validate(
        '{"scenario_paths": ["Accelerated industrial timeline", "Regional fragmentation"], "tipping_points": ["Archival papermaking"]}'
    )
    assert len(c_res.scenario_paths) == 2
    assert c_res.scenario_paths[0].label == "Accelerated industrial timeline"
    assert c_res.scenario_paths[0].type == "PRIMARY"
    assert c_res.scenario_paths[1].type == "ALTERNATE_OPTIMISTIC"
    assert len(c_res.tipping_points) == 1
    assert c_res.tipping_points[0].event == "Archival papermaking"

    # Test StakeholderDebateOutput normalization with string lists
    s_wrapper = StructuredOutputWrapper(None, StakeholderDebateOutput)
    s_res = s_wrapper._parse_and_validate(
        '{"summary": "Scholarly deliberation", "stakeholders": ["Alexandrian Academy", "Imperial Senate"]}'
    )
    assert s_res.summary == "Scholarly deliberation"
    assert len(s_res.stakeholders) == 2
    assert s_res.stakeholders[0].name == "Alexandrian Academy"
    assert s_res.stakeholders[0].tone == "PRAGMATIC"
    assert s_res.stakeholders[1].name == "Imperial Senate"


def test_apple_foundation_adapter_fallback_on_unavailable_runner():
    from src.providers import AppleFoundationAdapter
    adapter = AppleFoundationAdapter(runner_path="/nonexistent/runner/path")
    text, usage = adapter.generate_with_usage("Test prompt for fallback", "Test system prompt")
    assert "AppleFoundation" in text
    assert usage["total_tokens"] > 0
    assert usage["prompt_tokens"] > 0
    assert usage["completion_tokens"] > 0


