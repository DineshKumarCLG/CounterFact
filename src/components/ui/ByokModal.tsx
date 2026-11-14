"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type BYOKProvider,
  type ClientBYOKConfig,
  PROVIDER_OPTIONS,
  getClientBYOK,
  saveClientBYOK,
} from "@/lib/byok-client";
import { RefinedButton } from "./RefinedButton";

interface ByokModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ByokModal({ isOpen, onClose }: ByokModalProps) {
  const [provider, setProvider] = useState<BYOKProvider>("bedrock");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [modelId, setModelId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      const current = getClientBYOK();
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
      setVerifyStatus("idle");
      setErrorMessage("");
    }
  }, [isOpen]);

  const activeProviderMeta = PROVIDER_OPTIONS.find((p) => p.id === provider) || PROVIDER_OPTIONS[0];

  const handleVerify = async () => {
    if (!activeProviderMeta.requiresKey) {
      setVerifyStatus("valid");
      return;
    }

    if (!apiKey.trim()) {
      setVerifyStatus("invalid");
      setErrorMessage("Please enter an API key");
      return;
    }

    setIsVerifying(true);
    setVerifyStatus("idle");
    setErrorMessage("");

    try {
      const res = await fetch(
        `/api/health?provider=${encodeURIComponent(provider)}&apiKey=${encodeURIComponent(apiKey)}`
      );
      const data = await res.json();
      if (data.status === "ok" && data.credentialsValid) {
        setVerifyStatus("valid");
      } else {
        setVerifyStatus("invalid");
        setErrorMessage(data.error || "Credentials failed health check");
      }
    } catch (err) {
      setVerifyStatus("invalid");
      setErrorMessage(err instanceof Error ? err.message : "Network error verifying credentials");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = () => {
    if (provider === "bedrock") {
      saveClientBYOK(null);
      onClose();
      return;
    }

    if (activeProviderMeta.requiresKey && !apiKey.trim()) {
      setErrorMessage("API key is required for " + activeProviderMeta.name);
      return;
    }

    const config: ClientBYOKConfig = {
      provider,
      apiKey: apiKey.trim() || undefined,
      modelId: modelId.trim() || undefined,
      baseUrl: baseUrl.trim() || undefined,
    };

    saveClientBYOK(config);
    onClose();
  };

  const handleReset = () => {
    saveClientBYOK(null);
    setProvider("bedrock");
    setApiKey("");
    setModelId("");
    setBaseUrl("");
    setVerifyStatus("idle");
    setErrorMessage("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-2xl glass-heavy p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] border border-white/10 z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                  <span>⚡ Multi-Provider Model Settings (BYOK)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Bring Your Own Key — credentials are kept client-side and never saved to the server.
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Provider List */}
            <div className="mt-4">
              <label className="text-xs font-medium text-zinc-300 block mb-2">
                Select LLM Provider
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {PROVIDER_OPTIONS.map((opt) => {
                  const selected = provider === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setProvider(opt.id);
                        setVerifyStatus("idle");
                        setErrorMessage("");
                      }}
                      className={`text-left p-2.5 rounded-xl border transition-all text-xs ${
                        selected
                          ? "bg-purple-600/20 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.25)] text-white"
                          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs">{opt.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            opt.id === "bedrock"
                              ? "bg-zinc-700/50 text-zinc-300"
                              : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate mt-1">
                        {opt.defaultModel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credential Inputs */}
            {activeProviderMeta.requiresKey ? (
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-zinc-300">
                      API Key for {activeProviderMeta.name}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[10px] text-purple-400 hover:text-purple-300"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setVerifyStatus("idle");
                      setErrorMessage("");
                    }}
                    placeholder={`Enter your ${activeProviderMeta.name} API key...`}
                    className="w-full h-9 px-3 text-xs bg-black/40 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 transition-colors font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Model ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      placeholder={activeProviderMeta.defaultModel}
                      className="w-full h-8 px-2.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Base URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="Default endpoint"
                      className="w-full h-8 px-2.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 transition-colors font-mono"
                    />
                  </div>
                </div>

                {verifyStatus === "valid" && (
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                    <span>✓</span> Credentials format validated
                  </div>
                )}

                {errorMessage && (
                  <div className="text-[11px] text-red-400 flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg">
                    <span>⚠</span> {errorMessage}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400">
                <span className="font-semibold text-zinc-200">AWS Bedrock (Default)</span>: Uses
                server-side configured credentials. No custom API key required.
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Reset to Default
              </button>

              <div className="flex items-center gap-2">
                {activeProviderMeta.requiresKey && (
                  <RefinedButton
                    variant="ghost"
                    onClick={handleVerify}
                    isLoading={isVerifying}
                    className="h-8 px-3 text-xs"
                  >
                    Test Key
                  </RefinedButton>
                )}
                <RefinedButton
                  variant="primary"
                  onClick={handleSave}
                  className="h-8 px-4 text-xs"
                >
                  Save Settings
                </RefinedButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
