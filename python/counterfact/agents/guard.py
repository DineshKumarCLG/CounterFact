"""
Guard Agent: Fact-checks and validates specialist findings against causal plausibility.
Supports Caveman prompt compression style to reduce token usage while preserving exact schema constraints.
"""

from typing import Dict, Any
from ..models import Domain, SpecialistFinding, GuardResult

GUARD_SYSTEM_PROMPT = """You are the CounterFact Causal Guard Agent.
Review the specialist's findings for logical coherence, causal plausibility, and historical grounding.
Flag any anachronisms, physically impossible developments, or extreme unmotivated leaps.
"""

CAVEMAN_GUARD_SYSTEM_PROMPT = """CounterFact Guard. Audit specialist findings.
Check: causal plausibility, logical coherence, historical grounding.
Flag: anachronisms, impossible physics, unmotivated leaps.
Output exact schema. Terse. No fluff.
"""


def run_guard(
    scenario: str,
    departure_point: str,
    findings: Dict[str, SpecialistFinding],
    llm: Any,
    use_caveman: bool = True,
) -> Dict[str, GuardResult]:
    guard_results: Dict[str, GuardResult] = {}
    structured_llm = llm.with_structured_output(GuardResult)

    try:
        from langchain_core.messages import SystemMessage, HumanMessage
    except ImportError:
        class SystemMessage:
            def __init__(self, content): self.content = content
        class HumanMessage:
            def __init__(self, content): self.content = content

    for domain_str, finding in findings.items():
        finding_text = finding.findings if hasattr(finding, "findings") else str(finding)
        if use_caveman:
            sys_msg = CAVEMAN_GUARD_SYSTEM_PROMPT
            user_msg = (
                f"Scenario: {scenario}\n"
                f"Departure: {departure_point}\n"
                f"Domain: {domain_str}\n"
                f"Findings: {finding_text}\n"
                f"Audit causal validity. Return passed boolean, issues list, sanitised boolean."
            )
        else:
            sys_msg = GUARD_SYSTEM_PROMPT
            user_msg = (
                f"Scenario: {scenario}\n"
                f"Departure Point: {departure_point}\n"
                f"Domain: {domain_str}\n"
                f"Findings:\n{finding_text}\n\n"
                f"Evaluate causal plausibility and determine if this finding passes review."
            )

        result = structured_llm.invoke([
            SystemMessage(content=sys_msg),
            HumanMessage(content=user_msg),
        ])
        guard_results[domain_str] = result

    return guard_results
