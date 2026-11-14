"""
Specialist Agent: Produces domain-specific counterfactual research and analysis.
"""

from typing import List, Dict
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.language_models.chat_models import BaseChatModel
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


def run_specialists(
    scenario: str,
    planner_output: PlannerOutput,
    llm: BaseChatModel,
) -> Dict[str, SpecialistFinding]:
    findings: Dict[str, SpecialistFinding] = {}

    structured_llm = llm.with_structured_output(SpecialistFinding)

    for domain in planner_output.active_agents:
        prompt = SPECIALIST_SYSTEM_PROMPT.format(domain=domain.value)
        user_msg = (
            f"Scenario: {scenario}\n"
            f"Departure Point: {planner_output.departure_point}\n\n"
            f"Provide your specialist analysis for the {domain.value} domain."
        )
        result = structured_llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content=user_msg),
        ])
        findings[domain.value] = result

    return findings
