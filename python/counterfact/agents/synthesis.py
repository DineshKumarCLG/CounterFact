"""
Synthesis Agent: Synthesizes multi-domain findings into a coherent narrative and reconciles contradictions.
"""

from typing import Dict
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.language_models.chat_models import BaseChatModel
from ..models import SpecialistFinding, SynthesisOutput, Contradiction


SYNTHESIS_SYSTEM_PROMPT = """You are the Lead Synthesis Agent for CounterFact.
Integrate findings from multiple specialized historical domains into a unified analysis.
Identify points of friction or disagreement across domains and classify each contradiction as:
- RESOLVED (synthesized into a coherent explanation)
- NUANCED (dependent on regional, temporal, or social variance)
- UNRESOLVED_TENSION (a genuine historical trade-off or paradox)
"""


def run_synthesis(
    scenario: str,
    departure_point: str,
    findings: Dict[str, SpecialistFinding],
    llm: BaseChatModel,
) -> SynthesisOutput:
    structured_llm = llm.with_structured_output(SynthesisOutput)

    findings_text = "\n\n".join(
        f"### {domain}\nFindings: {f.findings}\nKey Datapoints: {', '.join(f.key_datapoints)}"
        for domain, f in findings.items()
    )

    user_msg = (
        f"Scenario: {scenario}\n"
        f"Departure Point: {departure_point}\n\n"
        f"Specialist Findings:\n{findings_text}\n\n"
        f"Synthesize these findings into a unified narrative and reconcile any inter-domain contradictions."
    )

    result = structured_llm.invoke([
        SystemMessage(content=SYNTHESIS_SYSTEM_PROMPT),
        HumanMessage(content=user_msg),
    ])
    return result
