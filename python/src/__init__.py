"""
CounterFact Python Evaluation Engine.
Provides LangGraph StateGraph orchestration and multi-tier evaluation.
"""

from .state import ScenarioState, Domain
from .graph import create_counterfact_graph, run_pipeline
from .evaluator import MultiTierEvaluator, evaluate_simulation, calculate_composite_score, EvaluationMetrics
from .providers import get_provider_adapter, ALL_PROVIDERS

__all__ = [
    "ScenarioState",
    "Domain",
    "create_counterfact_graph",
    "run_pipeline",
    "MultiTierEvaluator",
    "evaluate_simulation",
    "calculate_composite_score",
    "EvaluationMetrics",
    "get_provider_adapter",
    "ALL_PROVIDERS",
]
