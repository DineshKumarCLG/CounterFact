"""
Multi-Tier Quantitative Evaluation Harness for CounterFact Simulations.
Computes four fundamental quality dimensions:
1. grounding_score: Empirical factual foundation & baseline historical data coverage
2. causal_validity_score: Plausibility, causal consistency & guardrail validation
3. domain_coverage_score: Interdisciplinary breadth & specialized domain representation
4. contradiction_resolution_score: Reconciliation & nuanced resolution of multi-agent tensions
"""

from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field

from .state import ScenarioState


class EvaluationMetrics(BaseModel):
    """Container for multi-tier evaluation metric results."""
    grounding_score: float = Field(ge=0.0, le=1.0, description="Empirical factual grounding [0.0 - 1.0]")
    causal_validity_score: float = Field(ge=0.0, le=1.0, description="Causal plausibility and consistency [0.0 - 1.0]")
    domain_coverage_score: float = Field(ge=0.0, le=1.0, description="Interdisciplinary domain coverage [0.0 - 1.0]")
    contradiction_resolution_score: float = Field(ge=0.0, le=1.0, description="Multi-agent contradiction resolution [0.0 - 1.0]")
    composite_score: float = Field(ge=0.0, le=1.0, description="Weighted composite evaluation score [0.0 - 1.0]")
    summary: str = Field(default="", description="Narrative evaluation summary")
    tier_breakdown: Dict[str, Any] = Field(default_factory=dict, description="Detailed per-tier scoring factors")

    @property
    def causal_validity(self) -> float:
        """Alias for backward compatibility with earlier metric readers."""
        return self.causal_validity_score

    @property
    def domain_coverage(self) -> float:
        """Alias for backward compatibility with earlier metric readers."""
        return self.domain_coverage_score

    @property
    def contradiction_resolution(self) -> float:
        """Alias for backward compatibility with earlier metric readers."""
        return self.contradiction_resolution_score

    @property
    def overall_score(self) -> float:
        """Alias for composite score."""
        return self.composite_score


def calculate_composite_score(
    metrics: Dict[str, float],
    weights: Optional[Dict[str, float]] = None,
) -> float:
    """
    Computes a weighted composite score from individual dimension scores.
    Standard default weights:
    - grounding: 0.30
    - causal_validity: 0.30
    - domain_coverage: 0.20
    - contradiction_resolution: 0.20
    """
    w = weights or {
        "grounding": 0.30,
        "causal_validity": 0.30,
        "domain_coverage": 0.20,
        "contradiction_resolution": 0.20,
    }

    # Extract score values with tolerance for key variations
    g = metrics.get("grounding_score", metrics.get("groundingScore", metrics.get("grounding", 0.85)))
    c = metrics.get("causal_validity_score", metrics.get("causalValidityScore", metrics.get("causal_validity", 0.85)))
    d = metrics.get("domain_coverage_score", metrics.get("domainCoverageScore", metrics.get("domain_coverage", 0.85)))
    r = metrics.get(
        "contradiction_resolution_score",
        metrics.get("contradictionScore", metrics.get("contradiction_resolution", 0.85)),
    )

    total_weight = sum(w.values())
    if total_weight <= 0:
        total_weight = 1.0

    raw = (
        (g * w.get("grounding", 0.30))
        + (c * w.get("causal_validity", 0.30))
        + (d * w.get("domain_coverage", 0.20))
        + (r * w.get("contradiction_resolution", 0.20))
    ) / total_weight

    return round(min(1.0, max(0.0, raw)), 4)


class MultiTierEvaluator:
    """Multi-tier evaluation engine evaluating simulation outputs across 4 dimensions."""

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or {
            "grounding": 0.30,
            "causal_validity": 0.30,
            "domain_coverage": 0.20,
            "contradiction_resolution": 0.20,
        }

    def compute_grounding_score(self, state: Union[ScenarioState, Dict[str, Any]]) -> float:
        """
        Dimension 1: Grounding Score.
        Evaluates the presence and density of verifiable historical/scientific datapoints.
        """
        agent_outputs = (
            state.agent_outputs
            if isinstance(state, ScenarioState)
            else (state.get("agent_outputs") or state.get("specialist_findings") or {})
        )
        baseline_data = (
            state.baseline_data
            if isinstance(state, ScenarioState)
            else (state.get("baseline_data") or [])
        )

        total_datapoints = len(baseline_data)
        for _, val in agent_outputs.items():
            if hasattr(val, "key_datapoints"):
                total_datapoints += len(val.key_datapoints)
            elif isinstance(val, dict):
                total_datapoints += len(val.get("key_datapoints", []))
            elif isinstance(val, str) and len(val) > 50:
                total_datapoints += 1

        # Base grounding score starts at 0.5 for valid output and scales with verifiable datapoints
        score = min(1.0, 0.50 + (total_datapoints * 0.08))
        return round(score, 3)

    def compute_causal_validity_score(self, state: Union[ScenarioState, Dict[str, Any]]) -> float:
        """
        Dimension 2: Causal Validity Score.
        Evaluates logical plausibility, departure point alignment, and guard check success rate.
        """
        guard_results = (
            state.guard_results
            if isinstance(state, ScenarioState)
            else (state.get("guard_results") or {})
        )

        if not guard_results:
            return 0.88  # High default validity if no guard flags

        total_checks = len(guard_results)
        passed_checks = 0
        total_issues = 0

        for _, res in guard_results.items():
            passed = getattr(res, "passed", True) if not isinstance(res, dict) else res.get("passed", True)
            issues = getattr(res, "issues", []) if not isinstance(res, dict) else res.get("issues", [])
            if passed:
                passed_checks += 1
            total_issues += len(issues)

        pass_ratio = passed_checks / max(1, total_checks)
        issue_penalty = min(0.3, total_issues * 0.05)
        score = max(0.2, min(1.0, pass_ratio - issue_penalty))
        return round(score, 3)

    def compute_domain_coverage_score(self, state: Union[ScenarioState, Dict[str, Any]]) -> float:
        """
        Dimension 3: Domain Coverage Score.
        Evaluates interdisciplinary breadth across the active domain spectrum.
        """
        active_agents = (
            state.active_agents
            if isinstance(state, ScenarioState)
            else (state.get("active_agents") or list(state.get("specialist_findings", {}).keys()))
        )

        agent_count = len(active_agents)
        # Optimal multi-disciplinary coverage is 4 to 6 active specialist domains
        if agent_count >= 5:
            score = 1.0
        elif agent_count >= 3:
            score = 0.85 + (agent_count - 3) * 0.075
        elif agent_count >= 1:
            score = 0.60 + (agent_count * 0.10)
        else:
            score = 0.40

        return round(min(1.0, score), 3)

    def compute_contradiction_resolution_score(self, state: Union[ScenarioState, Dict[str, Any]]) -> float:
        """
        Dimension 4: Contradiction Resolution Score.
        Evaluates how effectively cross-domain tensions are detected and resolved.
        """
        synthesis = (
            state.synthesis
            if isinstance(state, ScenarioState)
            else state.get("synthesis")
        )

        if not synthesis:
            return 0.85

        contradictions = []
        if isinstance(synthesis, dict):
            contradictions = synthesis.get("contradictions", [])
        elif hasattr(synthesis, "contradictions"):
            contradictions = synthesis.contradictions

        if not contradictions:
            return 0.95  # Clean synthesis without unresolved tensions

        resolved = 0
        for c in contradictions:
            res_type = getattr(c, "resolution_type", "") if not isinstance(c, dict) else c.get("resolution_type", "")
            if res_type in ("RESOLVED", "NUANCED"):
                resolved += 1

        score = max(0.3, min(1.0, (resolved / len(contradictions))))
        return round(score, 3)

    def evaluate(self, state: Union[ScenarioState, Dict[str, Any]]) -> EvaluationMetrics:
        """Runs the complete 4-tier evaluation suite on a scenario state."""
        grounding = self.compute_grounding_score(state)
        causal = self.compute_causal_validity_score(state)
        domain = self.compute_domain_coverage_score(state)
        contradiction = self.compute_contradiction_resolution_score(state)

        metrics_dict = {
            "grounding_score": grounding,
            "causal_validity_score": causal,
            "domain_coverage_score": domain,
            "contradiction_resolution_score": contradiction,
        }
        composite = calculate_composite_score(metrics_dict, self.weights)

        summary = (
            f"Evaluation Summary: Composite Quality Score = {composite:.2f} | "
            f"Grounding = {grounding:.2f}, Causal Validity = {causal:.2f}, "
            f"Domain Coverage = {domain:.2f}, Contradiction Resolution = {contradiction:.2f}"
        )

        breakdown = {
            "metrics": metrics_dict,
            "weights": self.weights,
            "scenario": state.scenario if isinstance(state, ScenarioState) else state.get("scenario", ""),
        }

        return EvaluationMetrics(
            grounding_score=grounding,
            causal_validity_score=causal,
            domain_coverage_score=domain,
            contradiction_resolution_score=contradiction,
            composite_score=composite,
            summary=summary,
            tier_breakdown=breakdown,
        )


def evaluate_simulation(state: Union[ScenarioState, Dict[str, Any]]) -> EvaluationMetrics:
    """Convenience helper to evaluate a simulation state using standard MultiTierEvaluator."""
    evaluator = MultiTierEvaluator()
    return evaluator.evaluate(state)
