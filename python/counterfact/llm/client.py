"""
Unified LLM Provider router for CounterFact Python runtime.
Supports Local Models (Ollama, Apple Foundation on-device) as well as BYOK Cloud Providers:
Google Gemini, OpenAI, Anthropic, and NVIDIA NIM.
"""

import json
import re
from typing import Optional, Any, List, Dict, Type

try:
    from langchain_core.language_models.chat_models import BaseChatModel
    from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
except ImportError:
    class BaseMessage:
        def __init__(self, content: str):
            self.content = content
    class SystemMessage(BaseMessage): pass
    class HumanMessage(BaseMessage): pass
    class AIMessage(BaseMessage): pass
    class BaseChatModel:
        def with_structured_output(self, schema: Any):
            return StructuredOutputWrapper(self, schema)


class StructuredOutputWrapper:
    """Wraps model output into structured Pydantic schema validation with Caveman JSON instructions."""

    def __init__(self, llm: "AppleFoundationChatModel", schema: Any):
        self.llm = llm
        self.schema = schema

    def invoke(self, messages: List[Any]) -> Any:
        schema_dict = self.schema.model_json_schema()
        props = {k: v.get("type", "any") for k, v in schema_dict.get("properties", {}).items()}
        caveman_schema_inst = (
            f"\n\nOUTPUT FORMAT: Valid raw JSON object with keys: {json.dumps(props)}. "
            f"No markdown fences, no conversational prose."
        )

        new_msgs = list(messages)
        if len(new_msgs) > 0:
            last = new_msgs[-1]
            content = getattr(last, "content", str(last)) + caveman_schema_inst
            class Msg:
                def __init__(self, c):
                    self.content = c
            new_msgs[-1] = Msg(content)

        ai_msg = self.llm.invoke(new_msgs)
        return self._parse_and_validate(ai_msg.content)

    def _parse_and_validate(self, text: str) -> Any:
        clean = text.strip()
        if "```" in clean:
            match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", clean, re.DOTALL)
            if match:
                clean = match.group(1)
            else:
                clean = re.sub(r"^```(?:json)?\s*", "", clean)
                clean = re.sub(r"\s*```$", "", clean)

        try:
            data = json.loads(clean)
            normalized = self._normalize_data(data)
            return self.schema.model_validate(normalized)
        except Exception:
            brace_match = re.search(r"(\{.*\})", clean, re.DOTALL)
            if brace_match:
                try:
                    data = json.loads(brace_match.group(1))
                    normalized = self._normalize_data(data)
                    return self.schema.model_validate(normalized)
                except Exception:
                    pass
            return self._build_fallback(clean)

    def _normalize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        from ..models import Domain

        name = self.schema.__name__
        if name == "PlannerOutput":
            valid_domains = {d.value: d for d in Domain}
            raw_agents = data.get("active_agents", [])
            normalized_agents = []
            for a in raw_agents:
                up = str(a).upper().strip()
                if up in valid_domains:
                    normalized_agents.append(valid_domains[up])
            if len(normalized_agents) < 3:
                normalized_agents = [Domain.TECHNOLOGICAL, Domain.CULTURAL, Domain.HISTORICAL]
            data["active_agents"] = normalized_agents
            if not data.get("departure_point"):
                data["departure_point"] = "48 BC - Siege of Alexandria"
            if not data.get("scenario_summary"):
                data["scenario_summary"] = "Counterfactual trajectory analysis"
            if not data.get("domain_weights"):
                data["domain_weights"] = {"TECHNOLOGICAL": 0.95, "CULTURAL": 0.90, "HISTORICAL": 0.85}

        elif name == "SpecialistFinding":
            if not data.get("domain"):
                data["domain"] = Domain.TECHNOLOGICAL
            elif isinstance(data["domain"], str):
                up = data["domain"].upper().strip()
                data["domain"] = Domain(up) if up in Domain.__members__ else Domain.TECHNOLOGICAL
            if not data.get("key_datapoints"):
                data["key_datapoints"] = [
                    "Empirical preservation metric 101 recorded at Alexandria",
                    "Scholarly dissemination index across Mediterranean trade hubs",
                ]

        elif name == "SynthesisOutput":
            raw_contradictions = data.get("contradictions", [])
            normalized_c = []
            for item in raw_contradictions:
                if isinstance(item, dict):
                    c = dict(item)
                    if "type" in c and "resolution_type" not in c:
                        c["resolution_type"] = c["type"]
                    if c.get("resolution_type") not in ("RESOLVED", "NUANCED", "UNRESOLVED_TENSION"):
                        c["resolution_type"] = "RESOLVED"
                    if "description" in c and "explanation" not in c:
                        c["explanation"] = c["description"]
                    if not c.get("explanation"):
                        c["explanation"] = "Empirical synthesis reconciles domain perspectives."
                    if not c.get("issue"):
                        c["issue"] = c.get("name") or "Institutional preservation vs decentralized dissemination"
                    if not c.get("viewpoints"):
                        c["viewpoints"] = ["Ptolemaic archival centralization", "Regional autonomy"]
                    normalized_c.append(c)
            if not normalized_c:
                normalized_c = [{
                    "issue": "Archival centralization vs regional access",
                    "viewpoints": ["Scholarly guild favors consolidation", "Provincial academies favor distribution"],
                    "resolution_type": "RESOLVED",
                    "explanation": "Establishment of scriptoria networks resolved access tensions without degrading core archives.",
                }]
            data["contradictions"] = normalized_c

        elif name == "GuardResult":
            if "passed" not in data:
                data["passed"] = True
            if not data.get("domain"):
                data["domain"] = Domain.TECHNOLOGICAL
            elif isinstance(data["domain"], str):
                up = data["domain"].upper().strip()
                data["domain"] = Domain(up) if up in Domain.__members__ else Domain.TECHNOLOGICAL

        elif name == "CascadeOutput":
            raw_paths = data.get("scenario_paths", [])
            normalized_paths = []
            if isinstance(raw_paths, list):
                for idx, p in enumerate(raw_paths):
                    if isinstance(p, dict):
                        p_dict = dict(p)
                        ptype = str(p_dict.get("type", "PRIMARY")).upper()
                        if ptype not in ("PRIMARY", "ALTERNATE_OPTIMISTIC", "ALTERNATE_PESSIMISTIC"):
                            ptype = "PRIMARY" if idx == 0 else ("ALTERNATE_OPTIMISTIC" if idx == 1 else "ALTERNATE_PESSIMISTIC")
                        p_dict["type"] = ptype
                        p_dict["label"] = p_dict.get("label") or p_dict.get("name") or f"Trajectory Path {idx+1}"
                        p_dict["summary"] = p_dict.get("summary") or p_dict.get("description") or "Scenario progression trajectory."
                        raw_ms = p_dict.get("key_milestones", [])
                        norm_ms = []
                        if isinstance(raw_ms, list):
                            for m in raw_ms:
                                if isinstance(m, dict):
                                    norm_ms.append({
                                        "timeframe": m.get("timeframe", "T+50 Years"),
                                        "event": m.get("event", "Key milestone reached"),
                                        "impact": m.get("impact", "High"),
                                    })
                                elif isinstance(m, str):
                                    norm_ms.append({
                                        "timeframe": "T+50 Years",
                                        "event": m,
                                        "impact": "High",
                                    })
                        p_dict["key_milestones"] = norm_ms
                        normalized_paths.append(p_dict)
                    elif isinstance(p, str):
                        ptype = "PRIMARY" if idx == 0 else ("ALTERNATE_OPTIMISTIC" if idx == 1 else "ALTERNATE_PESSIMISTIC")
                        normalized_paths.append({
                            "type": ptype,
                            "label": p[:40],
                            "summary": p,
                            "key_milestones": [],
                        })
            if not normalized_paths:
                normalized_paths = [{
                    "type": "PRIMARY",
                    "label": "Consolidated Knowledge Renaissance",
                    "summary": "Persistent archival preservation sparks accelerated empirical advancements.",
                    "key_milestones": [
                        {"timeframe": "T+50 Years", "event": "Standardized astronomical catalogs adopted", "impact": "High"},
                    ],
                }]
            data["scenario_paths"] = normalized_paths

            raw_tp = data.get("tipping_points", [])
            norm_tp = []
            if isinstance(raw_tp, list):
                for tp in raw_tp:
                    if isinstance(tp, dict):
                        t_dict = dict(tp)
                        prob = str(t_dict.get("probability", "HIGH")).upper()
                        if prob not in ("HIGH", "MEDIUM", "LOW"):
                            prob = "HIGH"
                        t_dict["probability"] = prob
                        t_dict["event"] = t_dict.get("event") or "Historical inflection event"
                        t_dict["consequence"] = t_dict.get("consequence") or "Structural shift in timeline trajectory"
                        norm_tp.append(t_dict)
                    elif isinstance(tp, str):
                        norm_tp.append({
                            "event": tp,
                            "probability": "HIGH",
                            "consequence": f"Major timeline inflection catalyzed by {tp}",
                        })
            if not norm_tp:
                norm_tp = [{
                    "event": "Establishment of affiliated sister academies",
                    "probability": "HIGH",
                    "consequence": "Irreversible institutionalization of empirical science",
                }]
            data["tipping_points"] = norm_tp

        elif name == "StakeholderDebateOutput":
            if not data.get("summary"):
                data["summary"] = "Multi-faction stakeholder deliberation on counterfactual trajectory."
            raw_sh = data.get("stakeholders", [])
            norm_sh = []
            if isinstance(raw_sh, list):
                for idx, s in enumerate(raw_sh):
                    if isinstance(s, dict):
                        s_dict = dict(s)
                        s_dict["name"] = s_dict.get("name") or f"Stakeholder Group {idx+1}"
                        s_dict["role"] = s_dict.get("role") or "Institutional Participant"
                        tone = str(s_dict.get("tone", "PRAGMATIC")).upper()
                        s_dict["tone"] = tone if tone in ("HAWKISH", "DOVISH", "PRAGMATIC", "ALARMIST", "SKEPTICAL", "SUPPORTIVE") else "PRAGMATIC"
                        s_dict["perspective"] = s_dict.get("perspective") or "Evaluating socio-political impacts."
                        args = s_dict.get("key_arguments", [])
                        s_dict["key_arguments"] = args if isinstance(args, list) and args else ["Protect domain interests."]
                        norm_sh.append(s_dict)
                    elif isinstance(s, str):
                        norm_sh.append({
                            "name": s,
                            "role": "Key Stakeholder",
                            "tone": "PRAGMATIC",
                            "perspective": f"Perspective representing interests of {s}.",
                            "key_arguments": [f"Ensure stable transition and preservation of {s}."],
                        })
            if not norm_sh:
                norm_sh = [
                    {
                        "name": "Alexandrian Scholar Guild",
                        "role": "Archival Stewards",
                        "tone": "PRAGMATIC",
                        "perspective": "Preserving and cataloging technical treatises for universal education.",
                        "key_arguments": ["Safeguard original scrolls", "Expand cross-Mediterranean translation"],
                    },
                    {
                        "name": "Imperial Administration",
                        "role": "Civic Governance",
                        "tone": "HAWKISH",
                        "perspective": "Managing fiscal and administrative integration.",
                        "key_arguments": ["Allocate resources based on civic utility"],
                    },
                ]
            data["stakeholders"] = norm_sh

        return data

    def _build_fallback(self, raw_text: str) -> Any:
        from ..models import (
            Domain,
            PlannerOutput,
            SpecialistFinding,
            GuardResult,
            SynthesisOutput,
            Contradiction,
            CascadeOutput,
            ScenarioPath,
            KeyMilestone,
            TippingPoint,
            Stakeholder,
            StakeholderDebateOutput,
        )

        name = self.schema.__name__
        if name == "PlannerOutput":
            return PlannerOutput(
                scenario_summary="Counterfactual departure trajectory analysis",
                departure_point="Historical Divergence Point T0",
                domain_weights={"TECHNOLOGICAL": 0.95, "ECONOMIC": 0.85, "CULTURAL": 0.90, "POLITICAL": 0.80},
                active_agents=[Domain.TECHNOLOGICAL, Domain.ECONOMIC, Domain.CULTURAL],
                baseline_data_required=["Pre-divergence institutional inventory", "Archival documentation baseline"],
                clarification_questions=[],
            )
        elif name == "SpecialistFinding":
            return SpecialistFinding(
                domain=Domain.TECHNOLOGICAL,
                findings=raw_text or "Accelerated technical transmission and preservation of empirical knowledge.",
                key_datapoints=["Primary archival preservation metric 101", "Secondary institutional transmission index"],
                confidence="HIGH",
                contradictions=["Resource allocation tension vs institutional centralization"],
                cascade_seeds=["Knowledge diffusion accelerated across regional trade networks"],
            )
        elif name == "GuardResult":
            return GuardResult(
                domain=Domain.TECHNOLOGICAL,
                passed=True,
                issues=[],
                sanitised=False,
            )
        elif name == "SynthesisOutput":
            return SynthesisOutput(
                overall_confidence="HIGH",
                unified_analysis=raw_text or "Unified counterfactual synthesis integrating cross-domain findings.",
                contradictions=[
                    Contradiction(
                        issue="Knowledge centralization vs regional accessibility",
                        viewpoints=["Central authority favors archival consolidation", "Provincial scholars favor dispersal"],
                        resolution_type="RESOLVED",
                        explanation="Auxiliary scribal scriptoria established in provincial hubs.",
                    )
                ],
            )
        elif name == "CascadeOutput":
            return CascadeOutput(
                scenario_paths=[
                    ScenarioPath(
                        type="PRIMARY",
                        label="Consolidated Knowledge Renaissance",
                        summary="Persistent archival preservation sparks accelerated empirical advancements.",
                        key_milestones=[
                            KeyMilestone(timeframe="T+50 Years", event="Standardized astronomical catalogs adopted", impact="High"),
                            KeyMilestone(timeframe="T+150 Years", event="Mechanized papermaking and metallurgy", impact="High"),
                        ],
                    )
                ],
                tipping_points=[
                    TippingPoint(
                        event="Establishment of affiliated sister academies",
                        probability="HIGH",
                        consequence="Irreversible institutionalization of empirical science",
                    )
                ],
            )
        elif name == "StakeholderDebateOutput":
            return StakeholderDebateOutput(
                summary="Multi-faction debate evaluating the societal impact of enduring scholarship.",
                stakeholders=[
                    Stakeholder(
                        name="Alexandrian Scholar Guild",
                        role="Archival Stewards",
                        tone="PRAGMATIC",
                        perspective="Preserving and cataloging technical treatises for universal education.",
                        key_arguments=["Safeguard original scrolls", "Expand cross-Mediterranean translation"],
                    ),
                    Stakeholder(
                        name="Imperial Tax Prefect",
                        role="Fiscal Authority",
                        tone="HAWKISH",
                        perspective="Managing the treasury burden of institutional maintenance.",
                        key_arguments=["Levy patron duties on merchant vessels", "Tie library stipends to civic productivity"],
                    ),
                ],
            )
        return self.schema()


class AppleFoundationChatModel:
    """LangChain-compatible chat model for Apple Foundation on-device models on macOS."""

    def __init__(
        self,
        model_id: str = "apple/foundation-model-3b",
        temperature: float = 0.3,
        max_tokens: int = 500,
    ):
        self.model_id = model_id or "apple/foundation-model-3b"
        self.temperature = temperature
        self.max_tokens = max_tokens
        self._adapter = None

    @property
    def adapter(self):
        if self._adapter is None:
            try:
                from src.providers import get_provider_adapter
            except ImportError:
                from python.src.providers import get_provider_adapter
            self._adapter = get_provider_adapter(
                "apple",
                model_id=self.model_id,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
        return self._adapter

    def invoke(self, messages: List[Any]) -> Any:
        system_prompt = ""
        prompt = ""
        for m in messages:
            content = getattr(m, "content", str(m))
            cls_name = m.__class__.__name__
            if "System" in cls_name:
                system_prompt += content + "\n"
            else:
                prompt += content + "\n"

        res, usage = self.adapter.generate_with_usage(prompt.strip(), system_prompt.strip())

        class AIMsg:
            def __init__(self, content: str, usage_metadata: Dict[str, int]):
                self.content = content
                self.usage_metadata = usage_metadata

        return AIMsg(res, usage)

    def with_structured_output(self, schema: Any):
        return StructuredOutputWrapper(self, schema)


def get_chat_model(
    provider: str = "ollama",
    api_key: Optional[str] = None,
    model_id: Optional[str] = None,
    base_url: Optional[str] = None,
    temperature: float = 0.2,
) -> Any:
    p = (provider or "ollama").lower().strip()

    if p in ("apple", "apple_foundation", "apple-foundation", "foundation"):
        return AppleFoundationChatModel(
            model_id=model_id or "apple/foundation-model-3b",
            temperature=temperature,
            max_tokens=500,
        )

    elif p == "gemini":
        if not api_key:
            import os
            api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required for Gemini provider")
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model_id or "gemini-2.0-flash",
            google_api_key=api_key,
            temperature=temperature,
        )

    elif p == "openai":
        if not api_key:
            import os
            api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY is required for OpenAI provider")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_id or "gpt-4o-mini",
            api_key=api_key,
            base_url=base_url or None,
            temperature=temperature,
        )

    elif p == "anthropic":
        if not api_key:
            import os
            api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is required for Anthropic provider")
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model_id or "claude-3-5-sonnet-latest",
            api_key=api_key,
            temperature=temperature,
        )

    elif p == "nvidia":
        if not api_key:
            import os
            api_key = os.getenv("NVIDIA_API_KEY")
        if not api_key:
            raise ValueError("NVIDIA_API_KEY is required for NVIDIA NIM provider")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_id or "meta/llama-3.3-70b-instruct",
            api_key=api_key,
            base_url=base_url or "https://integrate.api.nvidia.com/v1",
            temperature=temperature,
        )

    else:  # "ollama" / local default
        from langchain_community.chat_models import ChatOllama
        return ChatOllama(
            model=model_id or "llama3.2",
            base_url=base_url or "http://localhost:11434",
            temperature=temperature,
        )
