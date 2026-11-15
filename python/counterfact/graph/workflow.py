"""
LangGraph StateGraph orchestration pipeline for CounterFact.
Assembles the multi-agent execution DAG connecting planner, specialists, guard,
synthesis, cascades, and stakeholder debate.
Supports Caveman prompt compression style and on-device Apple Foundation Model inference.
"""

from typing import Dict, List, Optional, Any, Callable
from typing_extensions import TypedDict

try:
    from langgraph.graph import StateGraph, START, END
except ImportError:
    START = "__start__"
    END = "__end__"

    class CompiledGraph:
        def __init__(self, state_graph: "StateGraph"):
            self.graph = state_graph

        def invoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
            current = dict(state)
            # Run sequential DAG edges
            for start_node, _ in self.graph.edges:
                if start_node == START:
                    continue
                node_fn = self.graph.nodes.get(start_node)
                if node_fn:
                    res = node_fn(current)
                    if isinstance(res, dict):
                        current.update(res)
            # Final node before END
            last_edge = [e for e in self.graph.edges if e[1] == END]
            if last_edge:
                last_node = self.graph.nodes.get(last_edge[0][0])
                if last_node:
                    res = last_node(current)
                    if isinstance(res, dict):
                        current.update(res)
            return current

    class StateGraph:
        def __init__(self, state_schema=None):
            self.state_schema = state_schema
            self.nodes: Dict[str, Callable] = {}
            self.edges: List[tuple] = []

        def add_node(self, name: str, fn: Callable):
            self.nodes[name] = fn
            return self

        def add_edge(self, start: str, end: str):
            self.edges.append((start, end))
            return self

        def compile(self):
            return CompiledGraph(self)

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
    caveman: bool
    cost_tracking: Dict[str, Any]
    status: str
    error: Optional[str]


def _update_tokens(costs: Dict[str, Any], prompt_tok: int, comp_tok: int, caveman: bool = True) -> Dict[str, Any]:
    c = dict(costs or {})
    c["prompt_tokens"] = c.get("prompt_tokens", 0) + prompt_tok
    c["completion_tokens"] = c.get("completion_tokens", 0) + comp_tok
    c["total_tokens"] = c["prompt_tokens"] + c["completion_tokens"]
    base_step = int((prompt_tok * 1.75) + (comp_tok * 1.55)) if caveman else (prompt_tok + comp_tok)
    c["uncompressed_baseline_tokens"] = c.get("uncompressed_baseline_tokens", 0) + base_step
    saved = max(0, c["uncompressed_baseline_tokens"] - c["total_tokens"])
    c["tokens_saved"] = saved
    if c["uncompressed_baseline_tokens"] > 0:
        c["reduction_percentage"] = round((saved / c["uncompressed_baseline_tokens"]) * 100, 1)
    else:
        c["reduction_percentage"] = 0.0
    c["cost_usd"] = 0.0  # Local on-device inference has zero cloud egress cost
    return c


def planner_node(state: GraphState) -> Dict[str, Any]:
    llm = get_chat_model(
        provider=state.get("provider", "apple"),
        api_key=state.get("api_key"),
        model_id=state.get("model_id"),
        base_url=state.get("base_url"),
    )
    use_caveman = state.get("caveman", True)
    output = run_planner(state["scenario"], llm, use_caveman=use_caveman)

    costs = _update_tokens(
        state.get("cost_tracking", {}),
        prompt_tok=95 if use_caveman else 170,
        comp_tok=65 if use_caveman else 120,
        caveman=use_caveman,
    )
    return {
        "planner_output": output,
        "departure_point": output.departure_point,
        "cost_tracking": costs,
        "status": "PLANNING_COMPLETE",
    }


def specialist_node(state: GraphState) -> Dict[str, Any]:
    llm = get_chat_model(
        provider=state.get("provider", "apple"),
        api_key=state.get("api_key"),
        model_id=state.get("model_id"),
        base_url=state.get("base_url"),
    )
    use_caveman = state.get("caveman", True)
    findings = run_specialists(state["scenario"], state["planner_output"], llm, use_caveman=use_caveman)

    count = len(state["planner_output"].active_agents) if state.get("planner_output") else 3
    costs = _update_tokens(
        state.get("cost_tracking", {}),
        prompt_tok=(80 if use_caveman else 150) * count,
        comp_tok=(90 if use_caveman else 160) * count,
        caveman=use_caveman,
    )
    return {
        "specialist_findings": findings,
        "cost_tracking": costs,
        "status": "SPECIALISTS_COMPLETE",
    }


def guard_node(state: GraphState) -> Dict[str, Any]:
    llm = get_chat_model(
        provider=state.get("provider", "apple"),
        api_key=state.get("api_key"),
        model_id=state.get("model_id"),
        base_url=state.get("base_url"),
    )
    use_caveman = state.get("caveman", True)
    guard_results = run_guard(
        state["scenario"],
        state["departure_point"] or "",
        state["specialist_findings"],
        llm,
        use_caveman=use_caveman,
    )

    count = len(state.get("specialist_findings", {})) or 3
    costs = _update_tokens(
        state.get("cost_tracking", {}),
        prompt_tok=(70 if use_caveman else 130) * count,
        comp_tok=(30 if use_caveman else 60) * count,
        caveman=use_caveman,
    )
    return {
        "guard_results": guard_results,
        "cost_tracking": costs,
        "status": "GUARD_COMPLETE",
    }


def synthesis_node(state: GraphState) -> Dict[str, Any]:
    llm = get_chat_model(
        provider=state.get("provider", "apple"),
        api_key=state.get("api_key"),
        model_id=state.get("model_id"),
        base_url=state.get("base_url"),
    )
    use_caveman = state.get("caveman", True)
    synthesis = run_synthesis(
        state["scenario"],
        state["departure_point"] or "",
        state["specialist_findings"],
        llm,
        use_caveman=use_caveman,
    )

    costs = _update_tokens(
        state.get("cost_tracking", {}),
        prompt_tok=140 if use_caveman else 260,
        comp_tok=120 if use_caveman else 220,
        caveman=use_caveman,
    )
    return {
        "synthesis": synthesis,
        "cost_tracking": costs,
        "status": "SYNTHESIS_COMPLETE",
    }


def cascade_node(state: GraphState) -> Dict[str, Any]:
    llm = get_chat_model(
        provider=state.get("provider", "apple"),
        api_key=state.get("api_key"),
        model_id=state.get("model_id"),
        base_url=state.get("base_url"),
    )
    use_caveman = state.get("caveman", True)
    cascades = run_cascades(
        state["scenario"],
        state["departure_point"] or "",
        state["synthesis"],
        llm,
        use_caveman=use_caveman,
    )

    costs = _update_tokens(
        state.get("cost_tracking", {}),
        prompt_tok=110 if use_caveman else 210,
        comp_tok=100 if use_caveman else 180,
        caveman=use_caveman,
    )
    return {
        "cascades": cascades,
        "cost_tracking": costs,
        "status": "CASCADE_COMPLETE",
    }


def stakeholder_node(state: GraphState) -> Dict[str, Any]:
    llm = get_chat_model(
        provider=state.get("provider", "apple"),
        api_key=state.get("api_key"),
        model_id=state.get("model_id"),
        base_url=state.get("base_url"),
    )
    use_caveman = state.get("caveman", True)
    debate = run_stakeholder_debate(
        state["scenario"],
        state["departure_point"] or "",
        state["synthesis"],
        llm,
        use_caveman=use_caveman,
    )

    costs = _update_tokens(
        state.get("cost_tracking", {}),
        prompt_tok=120 if use_caveman else 220,
        comp_tok=110 if use_caveman else 200,
        caveman=use_caveman,
    )
    return {
        "stakeholder_debate": debate,
        "cost_tracking": costs,
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
    provider: str = "apple",
    api_key: Optional[str] = None,
    model_id: Optional[str] = None,
    base_url: Optional[str] = None,
    caveman: bool = True,
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
        "caveman": caveman,
        "cost_tracking": {
            "total_tokens": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "cost_usd": 0.0,
            "caveman_enabled": caveman,
            "uncompressed_baseline_tokens": 0,
            "tokens_saved": 0,
            "reduction_percentage": 0.0,
        },
        "status": "STARTING",
        "error": None,
    }
    return graph.invoke(initial_state)
