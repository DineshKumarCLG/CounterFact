"""
Specialist Agent: Produces domain-specific counterfactual research and analysis.
Supports Caveman prompt compression style to reduce token usage while preserving exact schema constraints.
"""

from typing import List, Dict, Any
from ..models import Domain, SpecialistFinding, PlannerOutput

SPECIALIST_SYSTEM_PROMPT = """You are a domain specialist analyst for CounterFact.
Domain: {domain}

Given a counterfactual scenario and departure point, conduct a rigorous, domain-specific analysis.
Identify:
1. Immediate primary impacts in this domain.
2. Key empirical datapoints and metrics.
3. Potential contradictions with conventional historical models.
4. Cascade seeds (second/third order ripples in other domains).
"""

CAVEMAN_SPECIALIST_SYSTEM_PROMPT = """CounterFact Domain Specialist: {domain}.
Analyze counterfactual trajectory from departure point.
Requirements:
1. Primary domain impacts.
2. Empirical datapoints and metrics.
3. Contradictions with conventional historical models.
4. Cascade seeds for ripple effects.
Style: Terse, high density, no filler. Preserve exact schema constraints.
"""


def run_specialists(
    scenario: str,
    planner_output: PlannerOutput,
    llm: Any,
    use_caveman: bool = True,
) -> Dict[str, SpecialistFinding]:
    findings: Dict[str, SpecialistFinding] = {}
    structured_llm = llm.with_structured_output(SpecialistFinding)

    try:
        from langchain_core.messages import SystemMessage, HumanMessage
    except ImportError:
        class SystemMessage:
            def __init__(self, content): self.content = content
        class HumanMessage:
            def __init__(self, content): self.content = content

    for domain in planner_output.active_agents:
        domain_val = domain.value if hasattr(domain, "value") else str(domain)
        if use_caveman:
            prompt = CAVEMAN_SPECIALIST_SYSTEM_PROMPT.format(domain=domain_val)
            user_msg = (
                f"Scenario: {scenario}\n"
                f"Departure: {planner_output.departure_point}\n"
                f"Domain: {domain_val}\n"
                f"Output findings, key datapoints, contradictions, cascade seeds."
            )
        else:
            prompt = SPECIALIST_SYSTEM_PROMPT.format(domain=domain_val)
            user_msg = (
                f"Scenario: {scenario}\n"
                f"Departure Point: {planner_output.departure_point}\n\n"
                f"Provide your specialist analysis for the {domain_val} domain."
            )

        result = structured_llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content=user_msg),
        ])
        findings[domain_val] = result

    return findings
