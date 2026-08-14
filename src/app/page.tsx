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
  KeyRound,
  Eye,
  EyeOff,
  ChevronDown,
  Loader2,
  Cpu,
  Sparkles,
} from "lucide-react";
import { generateKey, encryptMessage } from "@/lib/crypto";
import { TTL_OPTIONS } from "@/lib/constants";
import TechnicalDeepDive from "@/components/TechnicalDeepDive";

/** Possible states for the creation flow */
type PageState = "compose" | "loading" | "success" | "error";

export default function HomePage() {
  const [state, setState] = useState<PageState>("compose");
  const [secret, setSecret] = useState("");
  const [ttl, setTtl] = useState(TTL_OPTIONS[0].value);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [showPassphraseText, setShowPassphraseText] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [usedPassphrase, setUsedPassphrase] = useState(false);
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);

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
      // 1. Generate AES-256-GCM URL link key client-side
      const keyBase64 = await generateKey();

      // 2. Encrypt secret (with optional PBKDF2 passphrase layer)
      const isPassProtected = showPassphraseInput && passphrase.trim().length > 0;
      setUsedPassphrase(isPassProtected);

      const encryptedPayload = await encryptMessage(
        secret,
        keyBase64,
        isPassProtected ? passphrase.trim() : undefined
      );

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

      // 4. Build the share URL with the key in the hash fragment (#)
      const url = `${window.location.origin}/secret/${id}#${keyBase64}`;
      setShareUrl(url);
      setState("success");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setState("error");
    }
  }, [secret, ttl, showPassphraseInput, passphrase]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
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
    setPassphrase("");
    setShowPassphraseInput(false);
    setShowPassphraseText(false);
    setShareUrl("");
    setCopied(false);
    setErrorMessage("");
    setCharCount(0);
    setUsedPassphrase(false);
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
            Share this link carefully - it can only be viewed{" "}
            <span className="text-ember-glow font-semibold">once</span>.
          </p>
        </div>

        {/* Share URL Card */}
        <div className="glass-panel rounded-2xl p-6 mb-6 glow-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-cyan-accent" />
              <span className="text-xs font-medium text-smoke uppercase tracking-wider">
                One-Time Secret Link
              </span>
            </div>
            {usedPassphrase && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-warn bg-amber-warn/10 px-2.5 py-0.5 rounded-full border border-amber-warn/20">
                <KeyRound className="w-3 h-3" />
                Passphrase Protected
              </span>
            )}
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

        {/* Passphrase Reminder Notice if configured */}
        {usedPassphrase && (
          <div className="glass-panel rounded-2xl p-5 mb-6 border border-amber-warn/20 bg-amber-warn/5">
            <div className="flex gap-3">
              <KeyRound className="w-5 h-5 text-amber-warn flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-amber-warn">
                  Send Passphrase Separately
                </p>
                <p className="text-ghost text-xs leading-relaxed">
                  The recipient must enter your custom passphrase to decrypt the payload.
                  For maximum security, share the passphrase via a separate communication channel (e.g. Signal or SMS).
                </p>
              </div>
            </div>
          </div>
        )}

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
              <p className="text-ash text-xs">
                The encryption key lives in the URL hash fragment and is never sent to the server.
              </p>
            </div>
          </div>
        </div>

        {/* Create Another */}
        <div className="text-center">
          <button
            onClick={handleReset}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-smoke hover:text-ivory border border-gunmetal hover:border-steel transition-all duration-200 cursor-pointer"
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
            className="btn-primary px-8 py-3 rounded-xl text-sm cursor-pointer"
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
          after a single view. End-to-end encrypted: the server{" "}
          <span className="font-medium text-ghost">never</span> sees your data.
        </p>
      </div>

      {/* Security Badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        {[
          { icon: Lock, label: "AES-256-GCM" },
          { icon: KeyRound, label: "PBKDF2 Dual-Layer" },
          { icon: Eye, label: "Zero-Knowledge" },
          { icon: Flame, label: "Atomic Burn" },
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
            placeholder="Enter your secret message, password, API key, or sensitive credentials..."
            rows={6}
            className="w-full bg-abyss rounded-xl p-4 text-sm text-ivory placeholder-steel border border-gunmetal/60 focus:border-cyan-accent/40 focus:outline-none focus:ring-1 focus:ring-cyan-accent/20 resize-none transition-all duration-200 font-mono"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 text-xs text-ash">
              <EyeOff className="w-3 h-3" />
              <span>Encrypted client-side before submission</span>
            </div>
            <span
              className={`text-xs font-mono ${charCount > MAX_CHARS * 0.9 ? "text-ember" : "text-ash"
                }`}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Optional Passphrase Toggle */}
        <div className="mb-5 border-t border-gunmetal/40 pt-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setShowPassphraseInput(!showPassphraseInput)}
              className="flex items-center gap-2 text-xs font-medium text-smoke hover:text-ivory transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-accent" />
              <span>Optional Passphrase Protection</span>
              <span className="text-[10px] text-cyan-accent font-semibold bg-cyan-accent/10 px-2 py-0.5 rounded-full border border-cyan-accent/20">
                {showPassphraseInput ? "Enabled" : "Add Extra Security"}
              </span>
            </button>
          </div>

          {showPassphraseInput && (
            <div className="animate-fade-in bg-abyss/60 rounded-xl p-4 border border-gunmetal/60 mb-2">
              <div className="relative">
                <input
                  type={showPassphraseText ? "text" : "password"}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter a secret passphrase known only to recipient..."
                  className="w-full bg-abyss rounded-lg px-3.5 py-2.5 pr-10 text-sm text-ivory placeholder-steel border border-gunmetal/60 focus:border-cyan-accent/40 focus:outline-none focus:ring-1 focus:ring-cyan-accent/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphraseText(!showPassphraseText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ash hover:text-ivory cursor-pointer"
                >
                  {showPassphraseText ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-ash mt-2 leading-relaxed">
                Uses <strong>PBKDF2-HMAC-SHA256 (100k rounds)</strong>. The recipient must enter this passphrase to decrypt even if they possess the link.
              </p>
            </div>
          )}
        </div>

        {/* TTL Selector */}
        <div className="mb-6">
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
          className="btn-primary w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer"
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
      <div className="glass-panel rounded-2xl p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-smoke uppercase tracking-wider">
            How Zero-Knowledge Works
          </h2>
          <button
            onClick={() => setIsDeepDiveOpen(true)}
            className="flex items-center gap-1.5 text-xs text-cyan-accent hover:text-cyan-dim font-medium transition-colors cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Technical Deep Dive</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {[
            {
              step: "01",
              title: "Client-Side Encrypt",
              desc: "Encrypted directly in your browser with AES-256-GCM + optional PBKDF2 before sending.",
            },
            {
              step: "02",
              title: "Fragment Isolation",
              desc: "Decryption keys stay exclusively in the URL hash (#), completely invisible to web servers.",
            },
            {
              step: "03",
              title: "Atomic Burn",
              desc: "Redis GETDEL permanently destroys the ciphertext on first retrieval. No second chances.",
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

        {/* Deep Dive Action Bar */}
        <button
          onClick={() => setIsDeepDiveOpen(true)}
          className="w-full py-2.5 px-4 rounded-xl bg-abyss/80 hover:bg-abyss border border-gunmetal/60 hover:border-cyan-accent/30 text-xs text-smoke hover:text-ivory flex items-center justify-between transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-accent" />
            <span>Curious how it works under the hood? Read the cryptographic specifications.</span>
          </div>
          <span className="text-[11px] text-cyan-accent font-semibold flex items-center gap-1">
            Explore Architecture &rarr;
          </span>
        </button>
      </div>

      {/* Technical Deep Dive Modal */}
      <TechnicalDeepDive
        isOpen={isDeepDiveOpen}
        onClose={() => setIsDeepDiveOpen(false)}
      />
    </div>
  );
}
