"""
Unit tests for python/src/ architecture components.
Validates ScenarioState, LangGraph StateGraph pipeline, MultiTierEvaluator, and providers.
"""

import sys
import os

# Ensure python root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.state import ScenarioState, Domain
from src.graph import create_counterfact_graph, run_pipeline
from src.evaluator import (
    MultiTierEvaluator,
    evaluate_simulation,
    calculate_composite_score,
    EvaluationMetrics,
)
from src.providers import (
    SUPPORTED_CLOUD_PROVIDERS,
    SUPPORTED_LOCAL_PROVIDERS,
    get_provider_adapter,
)


def test_scenario_state_schema():
    state = ScenarioState(
        scenario="What if the steam engine appeared in antiquity?",
        departure_point="100 BC",
        active_agents=["TECHNOLOGICAL", "ECONOMIC"],
        synthesis={"unified_analysis": "Industrial revolution centuries early."},
        cost_tracking={"total_tokens": 1500, "cost_usd": 0.02},
    )
    assert state.scenario == "What if the steam engine appeared in antiquity?"
    assert state.departure_point == "100 BC"
    assert len(state.active_agents) == 2
    assert state.synthesis["unified_analysis"] is not None
    assert state.cost_tracking["total_tokens"] == 1500
    assert state.cost_tracking["cost_usd"] == 0.02


def test_provider_adapter_contracts():
    assert len(SUPPORTED_CLOUD_PROVIDERS) == 4
    assert len(SUPPORTED_LOCAL_PROVIDERS) == 3

    for p in ["gemini", "openai", "anthropic", "nvidia"]:
        assert p in SUPPORTED_CLOUD_PROVIDERS
    for p in ["ollama", "vllm", "huggingface"]:
        assert p in SUPPORTED_LOCAL_PROVIDERS

    ollama_adapter = get_provider_adapter("ollama")
    assert ollama_adapter.model_id == "llama3.2"

    vllm_adapter = get_provider_adapter("vllm")
    assert "8B" in vllm_adapter.model_id


def test_evaluator_metrics_computation():
    mock_state = ScenarioState(
        scenario="Antiquity Steam Engine",
        departure_point="100 BC",
        active_agents=["TECHNOLOGICAL", "ECONOMIC", "POLITICAL"],
        baseline_data=["Hero of Alexandria aeolipile documented", "Roman metallurgy baseline"],
        agent_outputs={
            "TECHNOLOGICAL": {"key_datapoints": ["High-pressure piston forged"]},
            "ECONOMIC": {"key_datapoints": ["Grain transport costs drop by 60%"]},
        },
        guard_results={"TECHNOLOGICAL": {"passed": True}, "ECONOMIC": {"passed": True}},
        synthesis={
            "unified_analysis": "Complete technological shift.",
            "contradictions": [{"resolution_type": "RESOLVED"}],
        },
    )

    evaluator = MultiTierEvaluator()
    metrics = evaluator.evaluate(mock_state)

    assert isinstance(metrics, EvaluationMetrics)
    assert 0.0 <= metrics.grounding_score <= 1.0
    assert 0.0 <= metrics.causal_validity_score <= 1.0
    assert 0.0 <= metrics.domain_coverage_score <= 1.0
    assert 0.0 <= metrics.contradiction_resolution_score <= 1.0
    assert 0.0 <= metrics.composite_score <= 1.0
    assert metrics.causal_validity == metrics.causal_validity_score
    assert metrics.domain_coverage == metrics.domain_coverage_score
    assert metrics.contradiction_resolution == metrics.contradiction_resolution_score


def test_composite_score_formula():
    metrics = {
        "grounding_score": 0.92,
        "causal_validity_score": 0.88,
        "domain_coverage_score": 1.0,
        "contradiction_resolution_score": 0.95,
    }
    score = calculate_composite_score(metrics)
    assert 0.90 <= score <= 0.95


def test_graph_pipeline_execution():
    state = run_pipeline("What if the Roman Empire never fell?", "AD 476")
    assert state.status == "COMPLETED"
    assert len(state.active_agents) >= 3
    assert state.departure_point != ""
    assert state.synthesis is not None
    assert state.cascades is not None
    assert state.stakeholder_debate is not None
    assert state.cost_tracking["total_tokens"] > 0
