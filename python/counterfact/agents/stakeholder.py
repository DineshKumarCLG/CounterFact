"""
Stakeholder Debate Agent: Simulates perspectives of affected historical figures, factions, and institutions.
Supports Caveman prompt compression style to reduce token usage while preserving exact schema constraints.
"""

from typing import Any
from ..models import StakeholderDebateOutput, SynthesisOutput

STAKEHOLDER_SYSTEM_PROMPT = """You are the Stakeholder Modeling Agent for CounterFact.
Simulate a multi-perspective debate among 3 to 5 realistic historical factions, leaders, or classes
affected by this counterfactual reality.
Each stakeholder should have a distinct tone (HAWKISH, DOVISH, PRAGMATIC, SKEPTICAL, etc.),
their specific interest/perspective, and their key arguments.
"""

CAVEMAN_STAKEHOLDER_SYSTEM_PROMPT = """CounterFact Stakeholder Debate.
Simulate 3-5 historical factions/leaders reacting to counterfactual outcome.
Each: name, role, tone (HAWKISH/DOVISH/PRAGMATIC/SKEPTICAL/etc.), perspective, key arguments.
Terse, high-information dialogue. No conversational padding.
"""


def run_stakeholder_debate(
    scenario: str,
    departure_point: str,
    synthesis: SynthesisOutput,
    llm: Any,
    use_caveman: bool = True,
) -> StakeholderDebateOutput:
    structured_llm = llm.with_structured_output(StakeholderDebateOutput)

    try:
        from langchain_core.messages import SystemMessage, HumanMessage
    except ImportError:
        class SystemMessage:
            def __init__(self, content): self.content = content
        class HumanMessage:
            def __init__(self, content): self.content = content

    analysis = synthesis.unified_analysis if hasattr(synthesis, "unified_analysis") else str(synthesis)

    if use_caveman:
        sys_msg = CAVEMAN_STAKEHOLDER_SYSTEM_PROMPT
        user_msg = (
            f"Scenario: {scenario}\n"
            f"Departure: {departure_point}\n"
            f"Synthesis: {analysis[:500]}...\n"
            f"Simulate 3-5 stakeholder perspectives."
        )
    else:
        sys_msg = STAKEHOLDER_SYSTEM_PROMPT
        user_msg = (
            f"Scenario: {scenario}\n"
            f"Departure Point: {departure_point}\n"
            f"Synthesis:\n{analysis[:800]}...\n\n"
            f"Simulate a stakeholder debate presenting diverse perspectives on this outcome."
        )

    result = structured_llm.invoke([
        SystemMessage(content=sys_msg),
        HumanMessage(content=user_msg),
    ])
    return result
