"""
Planner Agent: Decomposes a counterfactual scenario into domain relevance weights and active agents.
"""

from typing import Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.language_models.chat_models import BaseChatModel
from ..models import PlannerOutput, Domain


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


def run_planner(scenario: str, llm: BaseChatModel) -> PlannerOutput:
    structured_llm = llm.with_structured_output(PlannerOutput)
    messages = [
        SystemMessage(content=PLANNER_SYSTEM_PROMPT),
        HumanMessage(content=f"Analyze this counterfactual scenario:\n\n{scenario}"),
    ]
    result = structured_llm.invoke(messages)
    return result
