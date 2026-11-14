"""
Unified LLM Provider router for CounterFact Python runtime.
Supports Local Models (Ollama) as well as BYOK Cloud Providers:
Google Gemini, OpenAI, Anthropic, and NVIDIA NIM.
"""

from typing import Optional, Any
from langchain_core.language_models.chat_models import BaseChatModel


def get_chat_model(
    provider: str = "ollama",
    api_key: Optional[str] = None,
    model_id: Optional[str] = None,
    base_url: Optional[str] = None,
    temperature: float = 0.2,
) -> BaseChatModel:
    p = provider.lower()

    if p == "gemini":
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
