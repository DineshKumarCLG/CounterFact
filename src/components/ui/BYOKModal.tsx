"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefinedButton } from "./RefinedButton";

export { OPENROUTER_PRESETS, type ModelPreset } from "@/lib/byok-client";
import { OPENROUTER_PRESETS } from "@/lib/byok-client";

export type BYOKProvider =
  | "bedrock"
  | "gemini"
  | "openai"
  | "anthropic"
  | "nvidia"
  | "openrouter"
  | "apple";

export interface BYOKConfig {
  provider: BYOKProvider;
  apiKey?: string;
  modelId?: string;
  baseUrl?: string;
}

export interface ProviderMeta {
  id: BYOKProvider;
  name: string;
  badge: string;
  defaultModel: string;
  description: string;
  requiresKey: boolean;
  placeholderKey: string;
  docsUrl: string;
}

export const PROVIDER_OPTIONS: ProviderMeta[] = [
  {
    id: "bedrock",
    name: "Server Default",
    badge: "Default",
    defaultModel: "anthropic.claude-3-5-sonnet",
    description: "Server-managed AWS Bedrock foundation models (no key required)",
    requiresKey: false,
    placeholderKey: "No key needed for server default",
    docsUrl: "https://aws.amazon.com/bedrock/",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    badge: "BYOK",
    defaultModel: "gemini-2.0-flash",
    description: "Google AI Gemini 2.0 Flash & Gemini 1.5 Pro models",
    requiresKey: true,
    placeholderKey: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "openai",
    name: "OpenAI",
    badge: "BYOK",
    defaultModel: "gpt-4o-mini",
    description: "GPT-4o, GPT-4o-mini, and OpenAI reasoning models",
    requiresKey: true,
    placeholderKey: "sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    badge: "BYOK",
    defaultModel: "claude-3-5-sonnet-latest",
    description: "Claude 3.5 Sonnet & Claude 3.5 Haiku direct models",
    requiresKey: true,
    placeholderKey: "sk-ant-api03-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    badge: "BYOK",
    defaultModel: "meta/llama-3.3-70b-instruct",
    description: "NVIDIA accelerated models on integrate.api.nvidia.com",
    requiresKey: true,
    placeholderKey: "nvapi-...",
    docsUrl: "https://build.nvidia.com/",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    badge: "BYOK",
    defaultModel: "anthropic/claude-3.5-sonnet",
    description: "Unified multi-model gateway across 300+ frontier LLMs",
    requiresKey: true,
    placeholderKey: "sk-or-v1-...",
    docsUrl: "https://openrouter.ai/keys",
  },
];

export const APPLE_PROVIDER_OPTION: ProviderMeta = {
  id: "apple",
  name: "Apple Foundation (On-Device)",
  badge: "On-Device",
  defaultModel: "apple/foundation-model-3b",
  description: "Apple Silicon on-device foundation model with zero cloud egress & Caveman compression",
  requiresKey: false,
  placeholderKey: "No key needed (runs locally on Apple Silicon)",
  docsUrl: "https://developer.apple.com/machine-learning/",
};

export const ALL_PROVIDER_OPTIONS: ProviderMeta[] = [...PROVIDER_OPTIONS, APPLE_PROVIDER_OPTION];

export const BYOK_STORAGE_KEY = "counterfact_byok_config";
export const LEGACY_STORAGE_KEY = "cf_byok_config";
export const BYOK_EVENT_NAME = "counterfact-byok-changed";
export const LEGACY_EVENT_NAME = "cf-byok-changed";

/**
 * Retrieve saved client BYOK configuration from localStorage.
 * Checks primary key `counterfact_byok_config` and falls back to `cf_byok_config`.
 */
export function getBYOKConfig(): BYOKConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BYOK_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.provider === "string") {
      return parsed as BYOKConfig;
    }
  } catch {
    // Ignore JSON parse errors
  }
  return null;
}

/**
 * Save client BYOK configuration to browser localStorage.
 * Writes to both primary and legacy keys, and dispatches custom events for live UI updates.
 */
export function saveBYOKConfig(config: BYOKConfig | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!config || config.provider === "bedrock") {
      localStorage.removeItem(BYOK_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      const serialized = JSON.stringify(config);
      localStorage.setItem(BYOK_STORAGE_KEY, serialized);
      localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
    }

    const payload = config && config.provider !== "bedrock" ? config : null;
    window.dispatchEvent(new CustomEvent(BYOK_EVENT_NAME, { detail: payload }));
    window.dispatchEvent(new CustomEvent(LEGACY_EVENT_NAME, { detail: payload }));
  } catch (err) {
    console.error("Failed to save BYOK configuration:", err);
  }
}

/**
 * Clear client BYOK configuration completely.
 */
export function clearBYOKConfig(): void {
  saveBYOKConfig(null);
}

/**
 * Construct HTTP headers for BYOK authentication to pass to engine routes.
 */
export function getBYOKHeaders(): Record<string, string> {
  const byok = getBYOKConfig();
  if (!byok || byok.provider === "bedrock") return {};

  const headers: Record<string, string> = {};
  if (byok.provider) headers["x-byok-provider"] = byok.provider;
  if (byok.apiKey) headers["x-byok-api-key"] = byok.apiKey;
  if (byok.modelId) headers["x-byok-model-id"] = byok.modelId;
  if (byok.baseUrl) headers["x-byok-base-url"] = byok.baseUrl;

  return headers;
}

export interface BYOKModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BYOKModal({ isOpen, onClose }: BYOKModalProps) {
  const [provider, setProvider] = useState<BYOKProvider>("bedrock");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [modelId, setModelId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [validationMessage, setValidationMessage] = useState("");

  const resetLocalForm = useCallback(() => {
    const current = getBYOKConfig();
    if (current) {
      setProvider(current.provider);
      setApiKey(current.apiKey || "");
      setModelId(current.modelId || "");
      setBaseUrl(current.baseUrl || "");
    } else {
      setProvider("bedrock");
      setApiKey("");
      setModelId("");
      setBaseUrl("");
    }
    setValidationStatus("idle");
    setValidationMessage("");
    setShowKey(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetLocalForm();
    }
  }, [isOpen, resetLocalForm]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const activeProvider = ALL_PROVIDER_OPTIONS.find((p) => p.id === provider) || ALL_PROVIDER_OPTIONS[0];

  const handleValidateKey = async () => {
    if (!activeProvider.requiresKey) {
      setValidationStatus("valid");
      setValidationMessage("Server Default does not require custom credentials.");
      return;
    }

    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setValidationStatus("invalid");
      setValidationMessage(`Please enter an API key for ${activeProvider.name}.`);
      return;
    }

    setIsValidating(true);
    setValidationStatus("idle");
    setValidationMessage("");

    try {
      const headers: Record<string, string> = {
        "x-byok-provider": provider,
        "x-byok-api-key": trimmedKey,
      };
      if (modelId.trim()) {
        headers["x-byok-model-id"] = modelId.trim();
      }

      const res = await fetch("/api/health", {
        method: "GET",
        headers,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === "ok" && data.credentialsValid) {
        setValidationStatus("valid");
        setValidationMessage(`Key format verified for ${activeProvider.name} (${data.model || activeProvider.defaultModel}).`);
      } else {
        setValidationStatus("invalid");
        setValidationMessage(data.error || "Credentials failed validation check (must be at least 8 characters).");
      }
    } catch (err) {
      setValidationStatus("invalid");
      setValidationMessage(err instanceof Error ? err.message : "Network error validating credentials.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    if (provider === "bedrock") {
      clearBYOKConfig();
      onClose();
      return;
    }

    const trimmedKey = apiKey.trim();
    if (activeProvider.requiresKey && !trimmedKey) {
      setValidationStatus("invalid");
      setValidationMessage(`API key is required for ${activeProvider.name}.`);
      return;
    }

    const config: BYOKConfig = {
      provider,
      apiKey: trimmedKey || undefined,
      modelId: modelId.trim() || undefined,
      baseUrl: baseUrl.trim() || undefined,
    };

    saveBYOKConfig(config);
    onClose();
  };

  const handleClear = () => {
    clearBYOKConfig();
    resetLocalForm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="byok-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-2xl glass-heavy p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] border border-white/10 z-10 overflow-hidden"
          >
            {/* Ambient Background Accent */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#7c5cfc]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/[0.08] relative z-10">
              <div>
                <h2
                  id="byok-modal-title"
                  className="text-base font-semibold text-white tracking-tight flex items-center gap-2"
                >
                  <span className="text-purple-400">⚡</span>
                  <span>Bring Your Own Key (BYOK)</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Configure custom model providers. Keys are stored locally in your browser and never logged or persisted on the server.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors focus:outline-none focus:ring-1 focus:ring-purple-400"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Provider Grid */}
            <div className="mt-4 relative z-10">
              <label className="text-xs font-medium text-zinc-300 block mb-2">
                Select Model Provider
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_PROVIDER_OPTIONS.map((opt) => {
                  const isSelected = provider === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setProvider(opt.id);
                        setValidationStatus("idle");
                        setValidationMessage("");
                      }}
                      className={`text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between min-h-[68px] ${
                        isSelected
                          ? "bg-purple-600/25 border-purple-500/70 shadow-[0_0_16px_rgba(168,85,247,0.3)] text-white"
                          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-zinc-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold truncate text-[11px] sm:text-xs">{opt.name}</span>
                        <span
                          className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                            opt.id === "bedrock"
                              ? "bg-zinc-700/60 text-zinc-300"
                              : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 truncate mt-1">
                        {opt.defaultModel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Provider Details & Fields */}
            <div className="mt-4 relative z-10">
              {activeProvider.requiresKey ? (
                <div className="space-y-3">
                  {/* API Key Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="byok-api-key" className="text-xs font-medium text-zinc-300">
                        {activeProvider.name} API Key <span className="text-red-400">*</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <a
                          href={activeProvider.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          Get API Key ↗
                        </a>
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          {showKey ? "Hide Key" : "Show Key"}
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        id="byok-api-key"
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          setValidationStatus("idle");
                          setValidationMessage("");
                        }}
                        placeholder={activeProvider.placeholderKey}
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full h-9 px-3 pr-20 text-xs bg-black/50 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleValidateKey}
                        disabled={isValidating || !apiKey.trim()}
                        className="absolute right-1 top-1 bottom-1 px-2.5 text-[10px] font-medium rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {isValidating ? (
                          <span className="w-3 h-3 rounded-full border border-purple-400 border-t-transparent animate-spin" />
                        ) : (
                          "Validate"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* OpenRouter Model Presets and Warning */}
                  {provider === "openrouter" && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-zinc-300">
                          Recommended Models
                        </label>
                        <span className="text-[10px] text-zinc-400">Quick select</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {OPENROUTER_PRESETS.map((preset) => {
                          const isSelected = (modelId || activeProvider.defaultModel) === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setModelId(preset.id)}
                              className={`text-left p-2 rounded-lg border text-xs transition-all ${
                                isSelected
                                  ? "bg-purple-600/20 border-purple-500/50 text-white"
                                  : "bg-white/[0.03] border-white/10 hover:border-white/20 text-zinc-300 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate text-[11px]">{preset.label}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 font-mono ml-1 shrink-0">
                                  {preset.tag}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">
                                {preset.id}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2 leading-relaxed">
                        <span className="text-amber-400 font-bold shrink-0 mt-0.5">⚠️</span>
                        <span>
                          <strong>Note:</strong> Some OpenRouter free models (such as <code>thinkingmachines/inkling-2-small:free</code>) return HTTP 403 Forbidden due to access gating. For reliable free usage, select <strong>Gemini 2.0 Flash (Free)</strong>.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Optional Model ID and Base URL */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="byok-model-id" className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Model ID (Optional)
                      </label>
                      <input
                        id="byok-model-id"
                        type="text"
                        value={modelId}
                        onChange={(e) => setModelId(e.target.value)}
                        placeholder={activeProvider.defaultModel}
                        className="w-full h-8 px-2.5 text-xs bg-black/50 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="byok-base-url" className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Base URL (Optional)
                      </label>
                      <input
                        id="byok-base-url"
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="Default endpoint"
                        className="w-full h-8 px-2.5 text-xs bg-black/50 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  {/* Validation Feedback Banner */}
                  {validationStatus === "valid" && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[11px] text-emerald-300 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl"
                    >
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{validationMessage || "Key format validated."}</span>
                    </motion.div>
                  )}

                  {validationStatus === "invalid" && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[11px] text-red-300 flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl"
                    >
                      <span className="text-red-400 font-bold">⚠</span>
                      <span>{validationMessage || "Validation failed."}</span>
                    </motion.div>
                  )}
                </div>
              ) : provider === "apple" ? (
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-zinc-300 space-y-1.5">
                  <div className="font-medium text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span>Apple Foundation Model (Local On-Device)</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Runs 100% locally on your Mac's Apple Silicon hardware via Apple's native <code>FoundationModels</code> framework with <strong>zero cloud egress</strong> and <strong>Caveman prompt compression</strong> enabled. No API key or cloud network connection needed.
                  </p>
                  <div className="pt-1 flex items-center gap-2 text-[10px] text-purple-300/80 font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/30">SystemLanguageModel.default</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">~40% Token Savings</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400 space-y-1">
                  <div className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Server-Managed AWS Bedrock (Default)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Runs using server-side configured AWS credentials and Claude 3.5 Sonnet. No personal API key required.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 pt-3 border-t border-white/[0.08] flex items-center justify-between relative z-10">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded hover:bg-white/[0.04]"
              >
                Clear / Reset
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 h-8 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <RefinedButton
                  variant="primary"
                  onClick={handleSave}
                  className="h-8 px-4 text-xs font-medium"
                >
                  Save Configuration
                </RefinedButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Backward-compatibility alias
export const ByokModal = BYOKModal;
