"""
CounterFact State Schema for LangGraph multi-agent simulation pipeline.
Defines typed Pydantic models for graph execution and evaluation channels.
"""

from enum import Enum
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, ConfigDict


class Domain(str, Enum):
    HISTORICAL = "HISTORICAL"
    ECONOMIC = "ECONOMIC"
    POLITICAL = "POLITICAL"
    MILITARY = "MILITARY"
    DIPLOMATIC = "DIPLOMATIC"
    SOCIAL = "SOCIAL"
    TECHNOLOGICAL = "TECHNOLOGICAL"
    ENVIRONMENTAL = "ENVIRONMENTAL"
    CULTURAL = "CULTURAL"
    LEGAL = "LEGAL"
    DEMOGRAPHIC = "DEMOGRAPHIC"
    URBAN_PLANNING = "URBAN_PLANNING"


class SpecialistFinding(BaseModel):
    domain: str = Field(description="Domain name")
    findings: str = Field(description="Detailed domain analysis")
    key_datapoints: List[str] = Field(default_factory=list, description="Grounding evidence points")
    confidence: str = Field(default="HIGH", description="Confidence level: HIGH, MEDIUM, LOW")
    contradictions: List[str] = Field(default_factory=list, description="Identified tensions with other domains")
    cascade_seeds: List[str] = Field(default_factory=list, description="Seeds for second-order ripple effects")


class GuardResult(BaseModel):
    domain: str = Field(description="Validated domain")
    passed: bool = Field(default=True, description="Whether analysis meets causal consistency standards")
    issues: List[str] = Field(default_factory=list, description="List of detected inconsistencies or causal breaks")
    sanitised: bool = Field(default=False, description="Whether output required sanitization")


class Contradiction(BaseModel):
    issue: str = Field(description="Core tension or conflicting claim between domains")
    viewpoints: List[str] = Field(default_factory=list, description="Contrasting domain perspectives")
    resolution_type: str = Field(default="RESOLVED", description="RESOLVED, NUANCED, or UNRESOLVED_TENSION")
    explanation: str = Field(description="Harmonized causal resolution")


class SynthesisOutput(BaseModel):
    overall_confidence: str = Field(default="HIGH", description="Confidence rating")
    unified_analysis: str = Field(description="Comprehensive synthesis across domains")
    contradictions: List[Contradiction] = Field(default_factory=list, description="Harmonized contradictions")


class KeyMilestone(BaseModel):
    timeframe: str
    event: str
    impact: str


class ScenarioPath(BaseModel):
    type: str = Field(description="PRIMARY, ALTERNATE_OPTIMISTIC, or ALTERNATE_PESSIMISTIC")
    label: str
    summary: str
    key_milestones: List[KeyMilestone] = Field(default_factory=list)


class TippingPoint(BaseModel):
    event: str
    probability: str = Field(description="HIGH, MEDIUM, or LOW")
    consequence: str


class CascadeOutput(BaseModel):
    scenario_paths: List[ScenarioPath] = Field(default_factory=list)
    tipping_points: List[TippingPoint] = Field(default_factory=list)


class Stakeholder(BaseModel):
    name: str
    role: str
    tone: str = Field(description="HAWKISH, DOVISH, PRAGMATIC, SKEPTICAL, etc.")
    perspective: str
    key_arguments: List[str] = Field(default_factory=list)


class StakeholderDebateOutput(BaseModel):
    summary: str
    stakeholders: List[Stakeholder] = Field(default_factory=list)


class ScenarioState(BaseModel):
    """
    Primary LangGraph pipeline state schema.
    Conforms to ORIGINAL_REQUEST § R5 and PROJECT § F19 specifications.
    """
    scenario: str = Field(description="Counterfactual premise scenario")
    departure_point: str = Field(default="", description="Point of historical divergence")
    active_agents: List[str] = Field(default_factory=list, description="List of active specialist domain agents")
    domain_weights: Dict[str, float] = Field(default_factory=dict, description="Domain relevance weights (0.0 to 1.0)")
    baseline_data: List[str] = Field(default_factory=list, description="Historical baseline facts")
    agent_outputs: Dict[str, Any] = Field(default_factory=dict, description="Outputs from specialist domain agents")
    guard_results: Dict[str, Any] = Field(default_factory=dict, description="Guardrail and causal validation results")
    synthesis: Optional[Dict[str, Any]] = Field(default=None, description="Unified synthesis and contradiction resolution")
    cascades: Optional[Dict[str, Any]] = Field(default=None, description="Second and third-order timeline cascades")
    stakeholder_debate: Optional[Dict[str, Any]] = Field(default=None, description="Multi-perspective stakeholder debate")
    cost_tracking: Dict[str, float] = Field(
        default_factory=lambda: {"total_tokens": 0, "cost_usd": 0.0},
        description="Token consumption and cost tracking",
    )
    status: str = Field(default="INITIALIZED", description="Pipeline execution status")
    error: Optional[str] = Field(default=None, description="Error message if pipeline execution fails")

    model_config = ConfigDict(arbitrary_types_allowed=True)
