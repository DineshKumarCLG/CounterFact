"""
Planner Agent: Decomposes a counterfactual scenario into domain relevance weights and active agents.
Supports Caveman prompt compression style to reduce token usage while preserving exact schema constraints.
"""

from typing import Dict, Any, Optional
from ..models import PlannerOutput, Domain

# Verbose baseline prompt for reference and comparison
PLANNER_SYSTEM_PROMPT = """You are the Lead Planning Agent for CounterFact.
Your role is to analyze a historical counterfactual scenario ("What if...?") and:
1. Identify the exact historical departure point (date, event, context).
2. Assign relevance weights (0.0 to 1.0) to candidate domains.
3. Select the most critical domains (weight >= 0.3) for specialist investigation.
4. List key baseline historical data required to ground the simulation.

Candidate Domains:
HISTORICAL, ECONOMIC, POLITICAL, MILITARY, DIPLOMATIC, SOCIAL,
TECHNOLOGICAL, ENVIRONMENTAL, CULTURAL, LEGAL, DEMOGRAPHIC, URBAN_PLANNING.
"""

# Caveman token-optimized high-density prompt
CAVEMAN_PLANNER_SYSTEM_PROMPT = """CounterFact Lead Planner. Analyze counterfactual premise.
Rules:
1. Exact departure point: date, event, context.
2. Domain relevance weights (0.0-1.0).
3. Active domains (weight >= 0.3).
4. Key baseline historical facts required for grounding.
Terse phrasing. High density. No filler. Preserve exact schema constraints.
Domains: HISTORICAL, ECONOMIC, POLITICAL, MILITARY, DIPLOMATIC, SOCIAL, TECHNOLOGICAL, ENVIRONMENTAL, CULTURAL, LEGAL, DEMOGRAPHIC, URBAN_PLANNING.
"""


def run_planner(scenario: str, llm: Any, use_caveman: bool = True) -> PlannerOutput:
    structured_llm = llm.with_structured_output(PlannerOutput)

    try:
        from langchain_core.messages import SystemMessage, HumanMessage
    except ImportError:
        class SystemMessage:
            def __init__(self, content): self.content = content
        class HumanMessage:
            def __init__(self, content): self.content = content

    if use_caveman:
        sys_prompt = CAVEMAN_PLANNER_SYSTEM_PROMPT
        user_prompt = f"Scenario: {scenario}\nDecompose departure point, domain weights, active domains, baseline facts."
    else:
        sys_prompt = PLANNER_SYSTEM_PROMPT
        user_prompt = f"Analyze this counterfactual scenario:\n\n{scenario}"

    messages = [
        SystemMessage(content=sys_prompt),
        HumanMessage(content=user_prompt),
    ]
    result = structured_llm.invoke(messages)
    return result
