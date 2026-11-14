"""
Guard Agent: Fact-checks and validates specialist findings against causal plausibility.
"""

from typing import Dict
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.language_models.chat_models import BaseChatModel
from ..models import Domain, SpecialistFinding, GuardResult


GUARD_SYSTEM_PROMPT = """You are the CounterFact Causal Guard Agent.
Review the specialist's findings for logical coherence, causal plausibility, and historical grounding.
Flag any anachronisms, physically impossible developments, or extreme unmotivated leaps.
"""


def run_guard(
    scenario: str,
    departure_point: str,
    findings: Dict[str, SpecialistFinding],
    llm: BaseChatModel,
) -> Dict[str, GuardResult]:
    guard_results: Dict[str, GuardResult] = {}
    structured_llm = llm.with_structured_output(GuardResult)

    for domain_str, finding in findings.items():
        user_msg = (
            f"Scenario: {scenario}\n"
            f"Departure Point: {departure_point}\n"
            f"Domain: {domain_str}\n"
            f"Findings:\n{finding.findings}\n\n"
            f"Evaluate causal plausibility and determine if this finding passes review."
        )
        result = structured_llm.invoke([
            SystemMessage(content=GUARD_SYSTEM_PROMPT),
            HumanMessage(content=user_msg),
        ])
        guard_results[domain_str] = result

    return guard_results
