"""
LangGraph StateGraph orchestration pipeline for CounterFact.
Assembles the multi-agent execution DAG connecting planner, specialists, guard,
synthesis, cascades, and stakeholder debate.
"""

from typing import Dict, List, Optional, Any
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END

from ..models import (
    PlannerOutput,
    SpecialistFinding,
    GuardResult,
    SynthesisOutput,
    CascadeOutput,
    StakeholderDebateOutput,
)
from ..agents.planner import run_planner
from ..agents.specialist import run_specialists
from ..agents.guard import run_guard
from ..agents.synthesis import run_synthesis
from ..agents.cascade import run_cascades
from ..agents.stakeholder import run_stakeholder_debate
from ..llm.client import get_chat_model


class GraphState(TypedDict):
    scenario: str
    provider: str
    api_key: Optional[str]
    model_id: Optional[str]
    base_url: Optional[str]
    departure_point: Optional[str]
    planner_output: Optional[PlannerOutput]
    specialist_findings: Dict[str, SpecialistFinding]
    guard_results: Dict[str, GuardResult]
    synthesis: Optional[SynthesisOutput]
    cascades: Optional[CascadeOutput]
    stakeholder_debate: Optional[StakeholderDebateOutput]
    status: str
    error: Optional[str]


def planner_node(state: GraphState) -> Dict[str, Any]:
    llm = get_chat_model(
        provider=state.get("provider", "ollama"),
        api_key=state.get("api_key"),
        model_id=state.get("model_id"),
        base_url=state.get("base_url"),
    )
    output = run_planner(state["scenario"], llm)
    return {
        "planner_output": output,
        "departure_point": output.departure_point,
        "status": "PLANNING_COMPLETE",
    }


def specialist_node(state: GraphState) -> Dict[str, Any]:
    llm = get_chat_model(
        provider=state.get("provider", "ollama"),
        api_key=state.get("api_key"),
        model_id=state.get("model_id"),
        base_url=state.get("base_url"),
    )
    findings = run_specialists(state["scenario"], state["planner_output"], llm)
    return {
        "specialist_findings": findings,
        "status": "SPECIALISTS_COMPLETE",
    }


def guard_node(state: GraphState) -> Dict[str, Any]:
    llm = get_chat_model(
        provider=state.get("provider", "ollama"),
        api_key=state.get("api_key"),
        model_id=state.get("model_id"),
        base_url=state.get("base_url"),
    )
    guard_results = run_guard(
        state["scenario"],
        state["departure_point"] or "",
        state["specialist_findings"],
        llm,
    )
    return {
        "guard_results": guard_results,
        "status": "GUARD_COMPLETE",
    }


def synthesis_node(state: GraphState) -> Dict[str, Any]:
    llm = get_chat_model(
        provider=state.get("provider", "ollama"),
        api_key=state.get("api_key"),
        model_id=state.get("model_id"),
        base_url=state.get("base_url"),
    )
    synthesis = run_synthesis(
        state["scenario"],
        state["departure_point"] or "",
        state["specialist_findings"],
        llm,
    )
    return {
        "synthesis": synthesis,
        "status": "SYNTHESIS_COMPLETE",
    }


def cascade_node(state: GraphState) -> Dict[str, Any]:
    llm = get_chat_model(
        provider=state.get("provider", "ollama"),
        api_key=state.get("api_key"),
        model_id=state.get("model_id"),
        base_url=state.get("base_url"),
    )
    cascades = run_cascades(
        state["scenario"],
        state["departure_point"] or "",
        state["synthesis"],
        llm,
    )
    return {
        "cascades": cascades,
    }


def stakeholder_node(state: GraphState) -> Dict[str, Any]:
    llm = get_chat_model(
        provider=state.get("provider", "ollama"),
        api_key=state.get("api_key"),
        model_id=state.get("model_id"),
        base_url=state.get("base_url"),
    )
    debate = run_stakeholder_debate(
        state["scenario"],
        state["departure_point"] or "",
        state["synthesis"],
        llm,
    )
    return {
        "stakeholder_debate": debate,
        "status": "COMPLETE",
    }


def create_counterfact_graph():
    builder = StateGraph(GraphState)

    builder.add_node("planner", planner_node)
    builder.add_node("specialists", specialist_node)
    builder.add_node("guard", guard_node)
    builder.add_node("synthesis", synthesis_node)
    builder.add_node("cascade", cascade_node)
    builder.add_node("stakeholder", stakeholder_node)

    # Workflow DAG transitions
    builder.add_edge(START, "planner")
    builder.add_edge("planner", "specialists")
    builder.add_edge("specialists", "guard")
    builder.add_edge("guard", "synthesis")
    builder.add_edge("synthesis", "cascade")
    builder.add_edge("cascade", "stakeholder")
    builder.add_edge("stakeholder", END)

    return builder.compile()


def run_counterfact_workflow(
    scenario: str,
    provider: str = "ollama",
    api_key: Optional[str] = None,
    model_id: Optional[str] = None,
    base_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute a full counterfactual simulation through the compiled LangGraph pipeline."""
    graph = create_counterfact_graph()
    initial_state: GraphState = {
        "scenario": scenario,
        "provider": provider,
        "api_key": api_key,
        "model_id": model_id,
        "base_url": base_url,
        "departure_point": None,
        "planner_output": None,
        "specialist_findings": {},
        "guard_results": {},
        "synthesis": None,
        "cascades": None,
        "stakeholder_debate": None,
        "status": "STARTING",
        "error": None,
    }
    return graph.invoke(initial_state)
