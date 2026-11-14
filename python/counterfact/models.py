"""
Data models and typed schemas for CounterFact multi-agent simulation pipeline.
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


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


class SafetyResult(BaseModel):
    status: str = Field(description="ALLOWED, RESTRICTED, or BLOCKED")
    reason: str = Field(default="")
    disclaimers: List[str] = Field(default_factory=list)


class PlannerOutput(BaseModel):
    scenario_summary: str = Field(description="Brief summary of the counterfactual scenario")
    departure_point: str = Field(description="Exact historical divergence event and date")
    domain_weights: Dict[str, float] = Field(description="Relevance weights 0.0 to 1.0 for domains")
    active_agents: List[Domain] = Field(description="Domains selected for multi-agent analysis")
    baseline_data_required: List[str] = Field(default_factory=list, description="Historical background facts")
    clarification_questions: List[str] = Field(default_factory=list)


class SpecialistFinding(BaseModel):
    domain: Domain
    findings: str = Field(description="Detailed domain-specific analysis")
    key_datapoints: List[str] = Field(default_factory=list)
    confidence: str = Field(default="HIGH", description="HIGH, MEDIUM, or LOW")
    contradictions: List[str] = Field(default_factory=list)
    cascade_seeds: List[str] = Field(default_factory=list)


class GuardResult(BaseModel):
    domain: Domain
    passed: bool = Field(description="Whether the findings pass factual grounding and causal plausibility")
    issues: List[str] = Field(default_factory=list)
    sanitised: bool = Field(default=False)


class Contradiction(BaseModel):
    issue: str
    viewpoints: List[str] = Field(default_factory=list)
    resolution_type: str = Field(description="RESOLVED, NUANCED, or UNRESOLVED_TENSION")
    explanation: str


class SynthesisOutput(BaseModel):
    overall_confidence: str = Field(default="HIGH", description="HIGH, MEDIUM, or LOW")
    unified_analysis: str = Field(description="Comprehensive synthesis integrating all domain findings")
    contradictions: List[Contradiction] = Field(default_factory=list)


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
    tone: str = Field(description="HAWKISH, DOVISH, PRAGMATIC, ALARMIST, SKEPTICAL, SUPPORTIVE, etc.")
    perspective: str
    key_arguments: List[str] = Field(default_factory=list)


class StakeholderDebateOutput(BaseModel):
    summary: str
    stakeholders: List[Stakeholder] = Field(default_factory=list)


class SimulationState(BaseModel):
    """Full execution state for CounterFact multi-agent simulation."""
    id: str
    scenario: str
    departure_point: Optional[str] = None
    status: str = "PENDING"
    safety_result: Optional[SafetyResult] = None
    planner_output: Optional[PlannerOutput] = None
    specialist_findings: Dict[str, SpecialistFinding] = Field(default_factory=dict)
    guard_results: Dict[str, GuardResult] = Field(default_factory=dict)
    synthesis: Optional[SynthesisOutput] = None
    cascades: Optional[CascadeOutput] = None
    stakeholder_debate: Optional[StakeholderDebateOutput] = None
    byok_provider: Optional[str] = None
    byok_model: Optional[str] = None
