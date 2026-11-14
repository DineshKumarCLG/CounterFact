"""
Stakeholder Debate Agent: Simulates perspectives of affected historical figures, factions, and institutions.
"""

from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.language_models.chat_models import BaseChatModel
from ..models import StakeholderDebateOutput, SynthesisOutput


STAKEHOLDER_SYSTEM_PROMPT = """You are the Stakeholder Modeling Agent for CounterFact.
Simulate a multi-perspective debate among 3 to 5 realistic historical factions, leaders, or classes
affected by this counterfactual reality.
Each stakeholder should have a distinct tone (HAWKISH, DOVISH, PRAGMATIC, SKEPTICAL, etc.),
their specific interest/perspective, and their key arguments.
"""


def run_stakeholder_debate(
    scenario: str,
    departure_point: str,
    synthesis: SynthesisOutput,
    llm: BaseChatModel,
) -> StakeholderDebateOutput:
    structured_llm = llm.with_structured_output(StakeholderDebateOutput)

    user_msg = (
        f"Scenario: {scenario}\n"
        f"Departure Point: {departure_point}\n"
        f"Synthesis:\n{synthesis.unified_analysis[:800]}...\n\n"
        f"Simulate a stakeholder debate presenting diverse perspectives on this outcome."
    )

    result = structured_llm.invoke([
        SystemMessage(content=STAKEHOLDER_SYSTEM_PROMPT),
        HumanMessage(content=user_msg),
    ])
    return result
