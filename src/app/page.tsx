"use client";

import { useState, useCallback } from "react";
import {
  Shield,
  Flame,
  Clock,
  Copy,
  Check,
  Link2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { generateKey, encryptMessage } from "@/lib/crypto";
import { TTL_OPTIONS } from "@/lib/constants";

/** Possible states for the creation flow */
type PageState = "compose" | "loading" | "success" | "error";

export default function HomePage() {
  const [state, setState] = useState<PageState>("compose");
  const [secret, setSecret] = useState("");
  const [ttl, setTtl] = useState(TTL_OPTIONS[0].value);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [charCount, setCharCount] = useState(0);

  const MAX_CHARS = 50_000;

  const handleSecretChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_CHARS) {
        setSecret(value);
        setCharCount(value.length);
      }
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!secret.trim()) return;

    setState("loading");
    setErrorMessage("");

    try {
      // 1. Generate encryption key client-side
      const keyBase64 = await generateKey();

      // 2. Encrypt the secret in the browser
      const encryptedPayload = await encryptMessage(secret, keyBase64);

      // 3. Send ONLY the encrypted payload to the server
      const response = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedPayload, ttlSeconds: ttl }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to store secret.");
      }

      const { id } = await response.json();

      // 4. Build the share URL with the key in the hash fragment
      //    The hash (#) is NEVER sent to the server
      const url = `${window.location.origin}/secret/${id}#${keyBase64}`;
      setShareUrl(url);
      setState("success");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setState("error");
    }
  }, [secret, ttl]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [shareUrl]);

  const handleReset = useCallback(() => {
    setState("compose");
    setSecret("");
    setShareUrl("");
    setCopied(false);
    setErrorMessage("");
    setCharCount(0);
  }, []);

  // ─── Success State ────────────────────────────────────────────────────
  if (state === "success") {
    return (
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-success/10 border border-teal-success/20 mb-4">
            <Check className="w-8 h-8 text-teal-success" />
          </div>
          <h1 className="text-2xl font-bold text-ivory mb-2">
            Secret Created Successfully
          </h1>
          <p className="text-smoke text-sm">
            Share this link carefully — it can only be viewed{" "}
            <span className="text-ember-glow font-semibold">once</span>.
          </p>
        </div>

        {/* Share URL Card */}
        <div className="glass-panel rounded-2xl p-6 mb-6 glow-border">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-cyan-accent" />
            <span className="text-xs font-medium text-smoke uppercase tracking-wider">
              One-Time Secret Link
            </span>
          </div>

          <div className="relative group">
            <div className="bg-abyss rounded-xl p-4 pr-14 border border-gunmetal/60 overflow-hidden">
              <code className="text-sm text-cyan-accent/90 break-all font-mono leading-relaxed">
                {shareUrl}
              </code>
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-1/2 right-3 -translate-y-1/2 p-2 rounded-lg bg-gunmetal/60 hover:bg-gunmetal text-ghost hover:text-ivory transition-all duration-200"
              title="Copy link"
            >
              {copied ? (
                <Check className="w-4 h-4 text-teal-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {copied && (
            <p className="text-teal-success text-xs mt-2 animate-fade-in">
              ✓ Copied to clipboard
            </p>
          )}
        </div>

        {/* Warnings */}
        <div className="glass-panel rounded-2xl p-5 mb-6 border border-ember/10">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-warn flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="text-ghost">
                <span className="font-semibold text-amber-warn">Important:</span>{" "}
                This link will self-destruct after being viewed once. There is no
                way to recover the secret after it has been read.
              </p>
              <p className="text-ash">
                The encryption key is embedded in the URL hash fragment and is
                never sent to the server. Only someone with this exact link can
                decrypt the secret.
              </p>
            </div>
          </div>
        </div>

        {/* Create Another */}
        <div className="text-center">
          <button
            onClick={handleReset}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-smoke hover:text-ivory border border-gunmetal hover:border-steel transition-all duration-200"
          >
            Create Another Secret
          </button>
        </div>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ember/10 border border-ember/20 mb-4">
            <AlertTriangle className="w-8 h-8 text-ember" />
          </div>
          <h1 className="text-2xl font-bold text-ivory mb-2">
            Something Went Wrong
          </h1>
          <p className="text-smoke text-sm">{errorMessage}</p>
        </div>

        <div className="text-center">
          <button
            onClick={handleReset}
            className="btn-primary px-8 py-3 rounded-xl text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Compose State (Default) ──────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl animate-slide-up">
      {/* Brand Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-obsidian border border-gunmetal/60 mb-5 animate-pulse-glow">
          <Flame className="w-10 h-10 text-ember-glow" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">
          <span className="text-gradient-ember">Burn</span>{" "}
          <span className="text-ivory">After Reading</span>
        </h1>
        <p className="text-smoke text-base max-w-md mx-auto leading-relaxed">
          Share secrets that{" "}
          <span className="text-cyan-accent font-medium">
            self-destruct
          </span>{" "}
          after a single view. End-to-end encrypted — the server{" "}
          <span className="font-medium text-ghost">never</span> sees your data.
        </p>
      </div>

      {/* Security Badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        {[
          { icon: Lock, label: "AES-256-GCM" },
          { icon: Eye, label: "Zero-Knowledge" },
          { icon: Flame, label: "Self-Destruct" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-obsidian/80 border border-gunmetal/40 text-xs text-smoke"
          >
            <Icon className="w-3 h-3 text-cyan-accent" />
            {label}
          </div>
        ))}
      </div>

      {/* Secret Input Card */}
      <div className="glass-panel rounded-2xl p-6 mb-6 glow-border">
        {/* Textarea */}
        <div className="relative mb-5">
          <label
            htmlFor="secret-input"
            className="flex items-center gap-2 text-xs font-medium text-smoke uppercase tracking-wider mb-2"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-accent" />
            Your Secret
          </label>
          <textarea
            id="secret-input"
            value={secret}
            onChange={handleSecretChange}
            placeholder="Enter your secret message, password, API key, or sensitive data..."
            rows={6}
            className="w-full bg-abyss rounded-xl p-4 text-sm text-ivory placeholder-steel border border-gunmetal/60 focus:border-cyan-accent/40 focus:outline-none focus:ring-1 focus:ring-cyan-accent/20 resize-none transition-all duration-200 font-mono"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 text-xs text-ash">
              <EyeOff className="w-3 h-3" />
              <span>Encrypted before leaving your browser</span>
            </div>
            <span
              className={`text-xs font-mono ${
                charCount > MAX_CHARS * 0.9 ? "text-ember" : "text-ash"
              }`}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>
        </div>

        {/* TTL Selector */}
        <div className="mb-5">
          <label
            htmlFor="ttl-select"
            className="flex items-center gap-2 text-xs font-medium text-smoke uppercase tracking-wider mb-2"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-accent" />
            Auto-Expire After
          </label>
          <div className="relative">
            <select
              id="ttl-select"
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value))}
              className="w-full bg-abyss rounded-xl px-4 py-3 text-sm text-ivory border border-gunmetal/60 focus:border-cyan-accent/40 focus:outline-none focus:ring-1 focus:ring-cyan-accent/20 appearance-none cursor-pointer transition-all duration-200"
            >
              {TTL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash pointer-events-none" />
          </div>
        </div>

        {/* Submit Button */}
        <button
          id="create-secret-btn"
          onClick={handleSubmit}
          disabled={!secret.trim() || state === "loading"}
          className="btn-primary w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          {state === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Encrypting & Storing...
            </>
          ) : (
            <>
              <Flame className="w-4 h-4" />
              Create One-Time Secret
            </>
          )}
        </button>
      </div>

      {/* How It Works */}
      <div className="glass-panel rounded-2xl p-5">
        <h2 className="text-xs font-semibold text-smoke uppercase tracking-wider mb-4">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: "01",
              title: "Encrypt",
              desc: "Your secret is encrypted in your browser with AES-256-GCM before anything leaves your device.",
            },
            {
              step: "02",
              title: "Share",
              desc: "The decryption key lives only in the URL hash fragment — invisible to the server.",
            },
            {
              step: "03",
              title: "Burn",
              desc: "The encrypted payload is atomically deleted from the server the moment it's retrieved.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="p-3 rounded-xl bg-abyss/60">
              <div className="text-[10px] font-bold text-cyan-accent/60 mb-1 font-mono">
                {step}
              </div>
              <div className="text-sm font-semibold text-ivory mb-1">
                {title}
              </div>
              <p className="text-xs text-ash leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
