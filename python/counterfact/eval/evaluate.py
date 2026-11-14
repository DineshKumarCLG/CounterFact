"""
Evaluation harness for CounterFact multi-agent simulations.
Scores simulation outputs on:
- grounding_score: factual foundation & baseline coverage
- causal_validity: logical coherence across departure points
- domain_coverage: multi-disciplinary breadth
- contradiction_resolution: reconciliation of inter-agent conflicts
"""

from typing import Dict, Any, List
from pydantic import BaseModel, Field


class EvaluationMetrics(BaseModel):
    grounding_score: float = Field(ge=0.0, le=1.0, description="Empirical factual grounding")
    causal_validity: float = Field(ge=0.0, le=1.0, description="Plausibility and causal consistency")
    domain_coverage: float = Field(ge=0.0, le=1.0, description="Breadth and depth of specialized domains")
    contradiction_resolution: float = Field(ge=0.0, le=1.0, description="Handling of multi-agent tensions")
    overall_score: float = Field(ge=0.0, le=1.0, description="Combined weighted score")
    summary: str


def evaluate_simulation(result_state: Dict[str, Any]) -> EvaluationMetrics:
    """Evaluate a finished simulation result dictionary and return comprehensive quality scores."""
    planner = result_state.get("planner_output")
    specialists = result_state.get("specialist_findings") or {}
    guards = result_state.get("guard_results") or {}
    synthesis = result_state.get("synthesis")
    cascades = result_state.get("cascades")

    # 1. Grounding score
    base_datapoints = 0
    for finding in specialists.values():
        if hasattr(finding, "key_datapoints"):
            base_datapoints += len(finding.key_datapoints)
        elif isinstance(finding, dict):
            base_datapoints += len(finding.get("key_datapoints", []))
    grounding = min(1.0, 0.4 + (base_datapoints * 0.1))

    # 2. Causal validity
    total_guards = len(guards)
    passed_guards = 0
    for g in guards.values():
        passed = g.passed if hasattr(g, "passed") else g.get("passed", False)
        if passed:
            passed_guards += 1
    causal_validity = (passed_guards / total_guards) if total_guards > 0 else 0.85

    # 3. Domain coverage
    active_count = len(specialists)
    domain_coverage = min(1.0, max(0.2, active_count / 6.0))

    # 4. Contradiction resolution
    contradictions = []
    if synthesis:
        contradictions = (
            synthesis.contradictions
            if hasattr(synthesis, "contradictions")
            else synthesis.get("contradictions", [])
        )
    if contradictions:
        resolved_count = 0
        for c in contradictions:
            res_type = c.resolution_type if hasattr(c, "resolution_type") else c.get("resolution_type", "")
            if res_type in ("RESOLVED", "NUANCED"):
                resolved_count += 1
        contradiction_resolution = resolved_count / len(contradictions)
    else:
        contradiction_resolution = 0.90

    overall = (
        (grounding * 0.25)
        + (causal_validity * 0.35)
        + (domain_coverage * 0.20)
        + (contradiction_resolution * 0.20)
    )

    return EvaluationMetrics(
        grounding_score=round(grounding, 3),
        causal_validity=round(causal_validity, 3),
        domain_coverage=round(domain_coverage, 3),
        contradiction_resolution=round(contradiction_resolution, 3),
        overall_score=round(overall, 3),
        summary=(
            f"Simulation evaluated with {active_count} active domains. "
            f"Grounding: {grounding:.2f}, Causal Validity: {causal_validity:.2f}, "
            f"Coverage: {domain_coverage:.2f}, Contradiction Resolution: {contradiction_resolution:.2f}."
        ),
    )
