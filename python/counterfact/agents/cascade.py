"""
Cascade Agent: Simulates second and third order ripple effects and generates 3 alternate scenario paths.
Supports Caveman prompt compression style to reduce token usage while preserving exact schema constraints.
"""

from typing import Any
from ..models import CascadeOutput, SynthesisOutput

CASCADE_SYSTEM_PROMPT = """You are the Cascade Modeling Agent for CounterFact.
Given a unified counterfactual synthesis, model the ripple effects across time.
Generate 3 distinct scenario paths:
1. PRIMARY (most probable trajectory)
2. ALTERNATE_OPTIMISTIC (benign branch)
3. ALTERNATE_PESSIMISTIC (adverse or conflict-prone branch)

Identify critical historical tipping points and their probabilities (HIGH, MEDIUM, LOW).
"""

CAVEMAN_CASCADE_SYSTEM_PROMPT = """CounterFact Cascade Model.
Map second/third-order temporal ripples from synthesis.
Generate 3 paths:
1. PRIMARY (high probability)
2. ALTERNATE_OPTIMISTIC (benign branch)
3. ALTERNATE_PESSIMISTIC (conflict/adverse branch)
Identify critical tipping points with probability (HIGH/MEDIUM/LOW).
Terse, dense, schema-accurate.
"""


def run_cascades(
    scenario: str,
    departure_point: str,
    synthesis: SynthesisOutput,
    llm: Any,
    use_caveman: bool = True,
) -> CascadeOutput:
    structured_llm = llm.with_structured_output(CascadeOutput)

    try:
        from langchain_core.messages import SystemMessage, HumanMessage
    except ImportError:
        class SystemMessage:
            def __init__(self, content): self.content = content
        class HumanMessage:
            def __init__(self, content): self.content = content

    analysis = synthesis.unified_analysis if hasattr(synthesis, "unified_analysis") else str(synthesis)

    if use_caveman:
        sys_msg = CAVEMAN_CASCADE_SYSTEM_PROMPT
        user_msg = (
            f"Scenario: {scenario}\n"
            f"Departure: {departure_point}\n"
            f"Synthesis: {analysis[:500]}...\n"
            f"Generate 3 scenario paths and key historical tipping points."
        )
    else:
        sys_msg = CASCADE_SYSTEM_PROMPT
        user_msg = (
            f"Scenario: {scenario}\n"
            f"Departure Point: {departure_point}\n"
            f"Unified Analysis Summary: {analysis[:800]}...\n\n"
            f"Generate the 3 scenario paths and key historical tipping points."
        )

    result = structured_llm.invoke([
        SystemMessage(content=sys_msg),
        HumanMessage(content=user_msg),
    ])
    return result
