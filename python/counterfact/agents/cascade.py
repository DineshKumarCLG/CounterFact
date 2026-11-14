"""
Cascade Agent: Simulates second and third order ripple effects and generates 3 alternate scenario paths.
"""

from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.language_models.chat_models import BaseChatModel
from ..models import CascadeOutput, SynthesisOutput


CASCADE_SYSTEM_PROMPT = """You are the Cascade Modeling Agent for CounterFact.
Given a unified counterfactual synthesis, model the ripple effects across time.
Generate 3 distinct scenario paths:
1. PRIMARY (most probable trajectory)
2. ALTERNATE_OPTIMISTIC (benign branch)
3. ALTERNATE_PESSIMISTIC (adverse or conflict-prone branch)

Identify critical historical tipping points and their probabilities (HIGH, MEDIUM, LOW).
"""


def run_cascades(
    scenario: str,
    departure_point: str,
    synthesis: SynthesisOutput,
    llm: BaseChatModel,
) -> CascadeOutput:
    structured_llm = llm.with_structured_output(CascadeOutput)

    user_msg = (
        f"Scenario: {scenario}\n"
        f"Departure Point: {departure_point}\n"
        f"Unified Analysis Summary: {synthesis.unified_analysis[:800]}...\n\n"
        f"Generate the 3 scenario paths and key historical tipping points."
    )

    result = structured_llm.invoke([
        SystemMessage(content=CASCADE_SYSTEM_PROMPT),
        HumanMessage(content=user_msg),
    ])
    return result
