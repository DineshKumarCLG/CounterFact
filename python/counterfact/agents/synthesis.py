"""
Synthesis Agent: Synthesizes multi-domain findings into a coherent narrative and reconciles contradictions.
Supports Caveman prompt compression style to reduce token usage while preserving exact schema constraints.
"""

from typing import Dict, Any
from ..models import SpecialistFinding, SynthesisOutput, Contradiction

SYNTHESIS_SYSTEM_PROMPT = """You are the Lead Synthesis Agent for CounterFact.
Integrate findings from multiple specialized historical domains into a unified analysis.
Identify points of friction or disagreement across domains and classify each contradiction as:
- RESOLVED (synthesized into a coherent explanation)
- NUANCED (dependent on regional, temporal, or social variance)
- UNRESOLVED_TENSION (a genuine historical trade-off or paradox)
"""

CAVEMAN_SYNTHESIS_SYSTEM_PROMPT = """CounterFact Lead Synthesis.
Synthesize multi-domain findings into unified analysis.
Reconcile inter-domain contradictions. Classify each:
- RESOLVED: coherent causal explanation
- NUANCED: variance by region/time/class
- UNRESOLVED_TENSION: structural historical trade-off
Style: Dense, objective, concise. Zero filler.
"""


def run_synthesis(
    scenario: str,
    departure_point: str,
    findings: Dict[str, SpecialistFinding],
    llm: Any,
    use_caveman: bool = True,
) -> SynthesisOutput:
    structured_llm = llm.with_structured_output(SynthesisOutput)

    try:
        from langchain_core.messages import SystemMessage, HumanMessage
    except ImportError:
        class SystemMessage:
            def __init__(self, content): self.content = content
        class HumanMessage:
            def __init__(self, content): self.content = content

    if use_caveman:
        findings_text = "\n".join(
            f"[{domain}] Findings: {getattr(f, 'findings', str(f))} | Points: {', '.join(getattr(f, 'key_datapoints', []))}"
            for domain, f in findings.items()
        )
        sys_msg = CAVEMAN_SYNTHESIS_SYSTEM_PROMPT
        user_msg = (
            f"Scenario: {scenario}\n"
            f"Departure: {departure_point}\n"
            f"Specialist Findings:\n{findings_text}\n"
            f"Output unified narrative and reconciled contradictions."
        )
    else:
        findings_text = "\n\n".join(
            f"### {domain}\nFindings: {getattr(f, 'findings', str(f))}\nKey Datapoints: {', '.join(getattr(f, 'key_datapoints', []))}"
            for domain, f in findings.items()
        )
        sys_msg = SYNTHESIS_SYSTEM_PROMPT
        user_msg = (
            f"Scenario: {scenario}\n"
            f"Departure Point: {departure_point}\n\n"
            f"Specialist Findings:\n{findings_text}\n\n"
            f"Synthesize these findings into a unified narrative and reconcile any inter-domain contradictions."
        )

    result = structured_llm.invoke([
        SystemMessage(content=sys_msg),
        HumanMessage(content=user_msg),
    ])
    return result
