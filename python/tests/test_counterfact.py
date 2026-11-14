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
