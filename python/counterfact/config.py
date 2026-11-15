"""
Configuration management for CounterFact Python runtime.
Supports environment variables and per-request overrides for BYOK.
"""

import os
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


@dataclass
class ProviderConfig:
    provider: str
    api_key: Optional[str] = None
    model_id: Optional[str] = None
    base_url: Optional[str] = None


def get_default_config() -> ProviderConfig:
    provider = os.getenv("LLM_PROVIDER", "ollama").lower()
    api_key = None
    model_id = None
    base_url = None

    if provider == "gemini":
        api_key = os.getenv("GEMINI_API_KEY")
        model_id = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    elif provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        model_id = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        base_url = os.getenv("OPENAI_BASE_URL")
    elif provider == "anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        model_id = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")
    elif provider in ("apple", "apple_foundation", "apple-foundation"):
        model_id = os.getenv("APPLE_MODEL", "apple/foundation-model-3b")
    elif provider == "nvidia":
        api_key = os.getenv("NVIDIA_API_KEY")
        model_id = os.getenv("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct")
        base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    else:  # ollama / local default
        provider = "ollama"
        model_id = os.getenv("OLLAMA_MODEL", "llama3.2")
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    return ProviderConfig(
        provider=provider,
        api_key=api_key,
        model_id=model_id,
        base_url=base_url,
    )
