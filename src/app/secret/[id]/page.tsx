"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Flame,
  ShieldAlert,
  AlertTriangle,
  Copy,
  Check,
  Lock,
  Eye,
  Loader2,
  ArrowLeft,
  ShieldOff,
  Clock,
} from "lucide-react";
import { decryptMessage } from "@/lib/crypto";

/** States for the retrieval flow */
type ViewState =
  | "confirm" // Show warning before revealing
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

  // Validate that we have a key in the hash before showing the confirm page
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    // Check for the encryption key in the URL hash
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setHasKey(false);
      setErrorMessage(
        "No decryption key found in the URL. The link may be incomplete or corrupted."
      );
      setState("error");
    }
  }, []);

  const handleReveal = useCallback(async () => {
    setState("loading");

    try {
      // 1. Extract the encryption key from the hash fragment
      const keyBase64 = window.location.hash.slice(1);
      if (!keyBase64) {
        throw new Error("No decryption key found in the URL hash.");
      }

      // 2. Fetch (and atomically delete) the encrypted payload from the server
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

      // 3. Decrypt the payload client-side using the key from the hash
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

  // ─── Burned / Not Found State ─────────────────────────────────────────
  if (state === "burned") {
    return (
      <div className="w-full max-w-xl animate-fade-in text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-obsidian border border-ember/20 mb-6 ember-glow">
          <ShieldOff className="w-10 h-10 text-ember" />
        </div>
        <h1 className="text-2xl font-bold text-ivory mb-3">
          Secret Already Burned
        </h1>
        <p className="text-smoke text-sm max-w-sm mx-auto mb-8 leading-relaxed">
          This secret has already been viewed and permanently destroyed, or it
          has expired. There is no way to recover it.
        </p>

        <div className="glass-panel rounded-2xl p-5 mb-8 border border-ember/10 text-left">
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-ash flex-shrink-0 mt-0.5" />
            <p className="text-sm text-ash leading-relaxed">
              Secrets are stored with a time-to-live and are automatically
              purged from the server even if never viewed.
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
          {!hasKey ? "Invalid Link" : "Decryption Failed"}
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

  // ─── Revealed State ───────────────────────────────────────────────────
  if (state === "revealed") {
    return (
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-success/10 border border-teal-success/20 mb-4">
            <Eye className="w-8 h-8 text-teal-success" />
          </div>
          <h1 className="text-2xl font-bold text-ivory mb-2">
            Secret Revealed
          </h1>
          <p className="text-smoke text-sm">
            This secret has been{" "}
            <span className="text-ember-glow font-semibold">
              permanently destroyed
            </span>{" "}
            on the server.
          </p>
        </div>

        {/* Decrypted Content */}
        <div className="glass-panel rounded-2xl p-6 mb-6 glow-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-success" />
              <span className="text-xs font-medium text-smoke uppercase tracking-wider">
                Decrypted Content
              </span>
            </div>
            <button
              onClick={handleCopySecret}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gunmetal/60 hover:bg-gunmetal text-xs text-ghost hover:text-ivory transition-all duration-200"
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
          </div>

          <div className="bg-abyss rounded-xl p-4 border border-gunmetal/60 max-h-96 overflow-auto">
            <pre className="text-sm text-ivory whitespace-pre-wrap break-words font-mono leading-relaxed">
              {decryptedSecret}
            </pre>
          </div>
        </div>

        {/* Destruction Notice */}
        <div className="glass-panel rounded-2xl p-5 mb-6 border border-ember/10">
          <div className="flex gap-3">
            <Flame className="w-5 h-5 text-ember flex-shrink-0 mt-0.5" />
            <p className="text-sm text-ash leading-relaxed">
              The encrypted payload has been deleted from the server. This
              secret exists only in your browser session right now. Once you
              navigate away, it will be gone forever.
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
          Fetching the encrypted payload and decrypting it locally.
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
        Someone shared a one-time secret with you. Once you view it, the
        encrypted payload will be{" "}
        <span className="text-ember-glow font-semibold">
          permanently destroyed
        </span>{" "}
        on the server.
      </p>

      {/* Warning Card */}
      <div className="glass-panel rounded-2xl p-5 mb-8 border border-amber-warn/15 text-left">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-warn flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-ghost font-medium">
              Warning: Viewing this secret will permanently destroy it.
            </p>
            <ul className="text-xs text-ash space-y-1 list-disc list-inside">
              <li>The secret can only be viewed once</li>
              <li>
                There is no way to recover it after viewing
              </li>
              <li>
                The decryption happens entirely in your browser
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Reveal Button */}
      <button
        id="reveal-secret-btn"
        onClick={handleReveal}
        className="btn-danger px-8 py-3.5 rounded-xl text-sm inline-flex items-center gap-2 mb-6"
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
