"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Flame,
  ShieldAlert,
  AlertTriangle,
  Copy,
  Check,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  ShieldOff,
  Clock,
  Trash2,
  Timer,
} from "lucide-react";
import { decryptMessage, inspectSecretEnvelope } from "@/lib/crypto";

/** States for the retrieval flow */
type ViewState =
  | "confirm" // Show warning before revealing
  | "passphrase_prompt" // Asking for out-of-band passphrase
  | "loading" // Fetching & decrypting
  | "revealed" // Secret is displayed
  | "burned" // Secret was already burned / expired
  | "error"; // Decryption or network error

export default function SecretViewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [state, setState] = useState<ViewState>("confirm");
  const [decryptedSecret, setDecryptedSecret] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasKey, setHasKey] = useState(true);

  // Passphrase state
  const [passphrase, setPassphrase] = useState("");
  const [showPassphraseText, setShowPassphraseText] = useState(false);
  const [passphraseError, setPassphraseError] = useState("");
  const cachedPayloadRef = useRef<string | null>(null);

  // Auto-wipe countdown (60 seconds)
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check for the encryption key in the URL hash
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setHasKey(false);
      setErrorMessage(
        "No decryption key found in the URL fragment (#). The link may be incomplete or truncated."
      );
      setState("error");
    }
  }, []);

  // Countdown timer when secret is revealed
  useEffect(() => {
    if (state === "revealed") {
      setTimeLeft(60);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Wipe in-memory secret completely
            setDecryptedSecret("");
            cachedPayloadRef.current = null;
            setState("burned");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  const handleReveal = useCallback(async () => {
    setState("loading");
    setErrorMessage("");

    try {
      const keyBase64 = window.location.hash.slice(1);
      if (!keyBase64) {
        throw new Error("No decryption key found in the URL hash.");
      }

      // 1. Fetch (and atomically destroy in Redis) the ciphertext
      const response = await fetch(`/api/secrets/${id}`);

      if (response.status === 404) {
        setState("burned");
        return;
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to retrieve secret.");
      }

      const { encryptedPayload } = await response.json();

      if (!encryptedPayload) {
        setState("burned");
        return;
      }

      cachedPayloadRef.current = encryptedPayload;

      // 2. Check if passphrase is required
      const { requiresPassphrase } = inspectSecretEnvelope(encryptedPayload);

      if (requiresPassphrase) {
        setState("passphrase_prompt");
        return;
      }

      // 3. Decrypt immediately if no passphrase required
      const plaintext = await decryptMessage(encryptedPayload, keyBase64);
      setDecryptedSecret(plaintext);
      setState("revealed");
    } catch (err: unknown) {
      if (state !== "burned") {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to decrypt the secret. The link may be invalid.";
        setErrorMessage(message);
        setState("error");
      }
    }
  }, [id, state]);

  const handleDecryptWithPassphrase = useCallback(async () => {
    if (!passphrase.trim()) {
      setPassphraseError("Please enter the passphrase.");
      return;
    }

    setPassphraseError("");
    setState("loading");

    try {
      const keyBase64 = window.location.hash.slice(1);
      const payload = cachedPayloadRef.current;

      if (!payload) {
        setState("burned");
        return;
      }

      const plaintext = await decryptMessage(payload, keyBase64, passphrase.trim());
      setDecryptedSecret(plaintext);
      setState("revealed");
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "INCORRECT_PASSPHRASE") {
        setPassphraseError("Incorrect passphrase. Please try again.");
        setState("passphrase_prompt");
      } else {
        setErrorMessage("Decryption failed. The data or key is corrupted.");
        setState("error");
      }
    }
  }, [passphrase]);

  const handleManualWipe = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDecryptedSecret("");
    cachedPayloadRef.current = null;
    setState("burned");
  }, []);

  const handleCopySecret = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(decryptedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = decryptedSecret;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [decryptedSecret]);

  // ─── Burned / Destroyed State ─────────────────────────────────────────
  if (state === "burned") {
    return (
      <div className="w-full max-w-xl animate-fade-in text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-obsidian border border-ember/20 mb-6 ember-glow">
          <ShieldOff className="w-10 h-10 text-ember" />
        </div>
        <h1 className="text-2xl font-bold text-ivory mb-3">
          Secret Permanently Destroyed
        </h1>
        <p className="text-smoke text-sm max-w-sm mx-auto mb-8 leading-relaxed">
          This secret was retrieved and erased from the server, expired due to TTL, or was wiped from active memory.
        </p>

        <div className="glass-panel rounded-2xl p-5 mb-8 border border-ember/10 text-left">
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-ash flex-shrink-0 mt-0.5" />
            <p className="text-sm text-ash leading-relaxed">
              Zero residual traces remain on the infrastructure or in your browser memory.
            </p>
          </div>
        </div>

        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-smoke hover:text-ivory border border-gunmetal hover:border-steel transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Create a New Secret
        </a>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="w-full max-w-xl animate-fade-in text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ember/10 border border-ember/20 mb-5">
          <AlertTriangle className="w-8 h-8 text-ember" />
        </div>
        <h1 className="text-2xl font-bold text-ivory mb-3">
          {!hasKey ? "Invalid Secret Link" : "Decryption Failed"}
        </h1>
        <p className="text-smoke text-sm max-w-sm mx-auto mb-8">
          {errorMessage}
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-smoke hover:text-ivory border border-gunmetal hover:border-steel transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </a>
      </div>
    );
  }

  // ─── Passphrase Prompt State ──────────────────────────────────────────
  if (state === "passphrase_prompt") {
    return (
      <div className="w-full max-w-lg animate-slide-up text-center">
        <div className="inline-flex items-center justify-center w-18 h-18 rounded-3xl bg-obsidian border border-amber-warn/30 mb-6 ember-glow">
          <KeyRound className="w-9 h-9 text-amber-warn" />
        </div>

        <h1 className="text-2xl font-bold text-ivory mb-2">
          Passphrase Protected
        </h1>
        <p className="text-smoke text-sm max-w-sm mx-auto mb-6 leading-relaxed">
          The creator secured this secret with an extra passphrase. Enter it below to derive the secondary decryption key.
        </p>

        <div className="glass-panel rounded-2xl p-6 mb-6 text-left glow-border">
          <label className="block text-xs font-medium text-smoke uppercase tracking-wider mb-2">
            Enter Passphrase
          </label>
          <div className="relative mb-4">
            <input
              type={showPassphraseText ? "text" : "password"}
              value={passphrase}
              onChange={(e) => {
                setPassphrase(e.target.value);
                setPassphraseError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDecryptWithPassphrase();
              }}
              placeholder="Enter the secret passphrase..."
              autoFocus
              className="w-full bg-abyss rounded-xl px-4 py-3 pr-11 text-sm text-ivory placeholder-steel border border-gunmetal/60 focus:border-cyan-accent/40 focus:outline-none focus:ring-1 focus:ring-cyan-accent/20"
            />
            <button
              type="button"
              onClick={() => setShowPassphraseText(!showPassphraseText)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ash hover:text-ivory cursor-pointer"
            >
              {showPassphraseText ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {passphraseError && (
            <p className="text-ember text-xs mb-4 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {passphraseError}
            </p>
          )}

          <button
            onClick={handleDecryptWithPassphrase}
            className="btn-primary w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            Unlock Secret
          </button>
        </div>

        <p className="text-xs text-ash">
          The payload is already burned from the server and cached only in your local session.
        </p>
      </div>
    );
  }

  // ─── Revealed State ───────────────────────────────────────────────────
  if (state === "revealed") {
    return (
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-success/10 border border-teal-success/20 mb-3">
            <Eye className="w-8 h-8 text-teal-success" />
          </div>
          <h1 className="text-2xl font-bold text-ivory mb-1">
            Secret Decrypted
          </h1>
          <p className="text-smoke text-sm">
            Destroyed on the server &middot; Exists only in your browser memory
          </p>
        </div>

        {/* Auto-Wipe Countdown Banner */}
        <div className="glass-panel rounded-xl p-3 mb-5 border border-amber-warn/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-amber-warn font-medium">
            <Timer className="w-4 h-4 animate-pulse" />
            <span>Auto-wiping memory in <strong>{timeLeft}s</strong></span>
          </div>
          <div className="w-32 bg-abyss rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-warn h-full transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            />
          </div>
        </div>

        {/* Decrypted Content */}
        <div className="glass-panel rounded-2xl p-6 mb-6 glow-border print:hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-success" />
              <span className="text-xs font-medium text-smoke uppercase tracking-wider">
                Decrypted Plaintext
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySecret}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gunmetal/60 hover:bg-gunmetal text-xs text-ghost hover:text-ivory transition-all duration-200 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-teal-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleManualWipe}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ember/20 hover:bg-ember/30 text-xs text-ember hover:text-white transition-all duration-200 cursor-pointer"
                title="Wipe immediately from memory"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Wipe Now
              </button>
            </div>
          </div>

          <div className="bg-abyss rounded-xl p-4 border border-gunmetal/60 max-h-96 overflow-auto">
            <pre className="text-sm text-ivory whitespace-pre-wrap break-words font-mono leading-relaxed select-all">
              {decryptedSecret}
            </pre>
          </div>
        </div>

        {/* Destruction Notice */}
        <div className="glass-panel rounded-2xl p-5 mb-6 border border-ember/10">
          <div className="flex gap-3">
            <Flame className="w-5 h-5 text-ember flex-shrink-0 mt-0.5" />
            <p className="text-sm text-ash leading-relaxed">
              The encrypted payload has been purged via <strong>Redis GETDEL</strong>. Once you navigate away or the timer reaches zero, it will be gone forever.
            </p>
          </div>
        </div>

        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-smoke hover:text-ivory border border-gunmetal hover:border-steel transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Create a New Secret
          </a>
        </div>
      </div>
    );
  }

  // ─── Loading State ────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="w-full max-w-xl animate-fade-in text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-obsidian border border-cyan-accent/20 mb-6 animate-pulse-glow">
          <Loader2 className="w-10 h-10 text-cyan-accent animate-spin" />
        </div>
        <h1 className="text-xl font-bold text-ivory mb-2">
          Retrieving & Decrypting...
        </h1>
        <p className="text-smoke text-sm">
          Purging from server and decrypting in browser memory.
        </p>
      </div>
    );
  }

  // ─── Confirm State (Default) ──────────────────────────────────────────
  return (
    <div className="w-full max-w-xl animate-slide-up text-center">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-obsidian border border-ember/20 mb-6 ember-glow animate-pulse-glow">
        <ShieldAlert className="w-10 h-10 text-amber-warn" />
      </div>

      <h1 className="text-2xl font-bold text-ivory mb-3">
        You&apos;ve Received a Secret
      </h1>
      <p className="text-smoke text-sm max-w-sm mx-auto mb-8 leading-relaxed">
        Someone shared an encrypted secret with you. Viewing it will{" "}
        <span className="text-ember-glow font-semibold">
          permanently burn
        </span>{" "}
        the payload from the server.
      </p>

      {/* Warning Card */}
      <div className="glass-panel rounded-2xl p-5 mb-8 border border-amber-warn/15 text-left">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-warn flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-ghost font-medium">
              Warning: This action is irreversible.
            </p>
            <ul className="text-xs text-ash space-y-1.5 list-disc list-inside">
              <li>The secret is destroyed on the server immediately on fetch</li>
              <li>Decryption occurs entirely in your browser using the URL key</li>
              <li>An in-memory auto-wipe timer triggers upon revelation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Reveal Button */}
      <button
        id="reveal-secret-btn"
        onClick={handleReveal}
        className="btn-danger px-8 py-3.5 rounded-xl text-sm inline-flex items-center gap-2 mb-6 cursor-pointer"
      >
        <Flame className="w-4 h-4" />
        Reveal & Burn Secret
      </button>

      <p className="text-xs text-ash">
        Are you ready? This action cannot be undone.
      </p>
    </div>
  );
}
