"use client";

import { useState } from "react";
import {
  Shield,
  Lock,
  Cpu,
  Flame,
  Globe,
  Code2,
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight,
  Database,
  KeyRound,
  FileCode,
} from "lucide-react";

interface TechnicalDeepDiveProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "architecture" | "threat-model" | "crypto-code" | "specifications";

export default function TechnicalDeepDive({
  isOpen,
  onClose,
}: TechnicalDeepDiveProps) {
  const [activeTab, setActiveTab] = useState<TabType>("architecture");
  const [activeStep, setActiveStep] = useState<number>(0);

  if (!isOpen) return null;

  const steps = [
    {
      id: "crypto",
      title: "1. Client-Side Cryptographic Key Generation & Encryption",
      subtitle: "Web Crypto API (SubtleCrypto)",
      icon: Lock,
      color: "text-cyan-accent",
      border: "border-cyan-accent/30",
      bg: "bg-cyan-accent/5",
      details: [
        "A cryptographically secure 256-bit symmetric key is generated directly in the user agent via window.crypto.subtle.generateKey with AES-GCM.",
        "A unique 96-bit (12-byte) cryptographically random Initialization Vector (IV) is sampled from window.crypto.getRandomValues for every single message.",
        "If the user specifies an optional passphrase, a secondary key is derived using PBKDF2-HMAC-SHA256 (100,000 iterations + 16-byte random salt) to create layered onion encryption.",
        "Plaintext never leaves client RAM unencrypted.",
      ],
    },
    {
      id: "fragment",
      title: "2. URL Fragment Isolation (RFC 3986 Compliance)",
      subtitle: "Zero-Knowledge Transmission",
      icon: Globe,
      color: "text-violet-link",
      border: "border-violet-link/30",
      bg: "bg-violet-link/5",
      details: [
        "The 256-bit encryption key is encoded as a URL-safe Base64 string and appended strictly to the URI fragment identifier: /secret/<id>#<key>.",
        "Per RFC 3986 Section 3.5, web browsers and user agents NEVER transmit the fragment identifier (#) in HTTP/HTTPS request headers (GET, POST, Referer).",
        "Neither Vercel, Upstash, intermediate proxies, nor server logs ever receive or record the decryption key.",
      ],
    },
    {
      id: "atomic",
      title: "3. Atomic Serverless Destruction (Redis GETDEL)",
      subtitle: "Single-Threaded Race-Condition Elimination",
      icon: Database,
      color: "text-ember-glow",
      border: "border-ember-glow/30",
      bg: "bg-ember-glow/5",
      details: [
        "When the recipient requests the secret, the Next.js edge route executes an atomic Redis GETDEL secret:<id> command in Upstash.",
        "GETDEL returns the ciphertext and deletes the key in one single atomic operation, preventing Time-Of-Check to Time-Of-Use (TOCTOU) race conditions.",
        "If multiple requests arrive simultaneously, exactly one requester gets the payload; all subsequent requests immediately receive a 404 response.",
        "Every key has an automatic Time-To-Live (TTL) expiration ensuring automatic garbage collection even if unread.",
      ],
    },
    {
      id: "ephemeral",
      title: "4. In-Memory Decryption & Ephemeral Memory Lifecycle",
      subtitle: "Client-Side Reconstruction & Auto-Wipe",
      icon: Flame,
      color: "text-teal-success",
      border: "border-teal-success/30",
      bg: "bg-teal-success/5",
      details: [
        "The recipient browser extracts the key from window.location.hash and passes the payload to window.crypto.subtle.decrypt.",
        "AES-GCM verifies the 128-bit authentication tag; if the ciphertext was tampered with or the wrong key/passphrase is supplied, decryption fails securely.",
        "A 60-second in-memory countdown begins immediately upon reveal. When expired or manually purged, memory references and DOM elements are wiped permanently.",
        "CSS print quarantine ensures secret blocks cannot be exposed via browser print commands.",
      ],
    },
  ];

  const threatScenarios = [
    {
      threat: "Database or Server Compromise",
      description: "An attacker gains full root access to the Upstash Redis database and backend API logs.",
      mitigation: "Zero-Knowledge. The database contains only high-entropy AES-GCM ciphertext blobs. The decryption key was never sent to the server and exists nowhere in backend storage.",
      status: "Immune",
    },
    {
      threat: "Network / ISP / Man-In-The-Middle Interception",
      description: "An adversary monitors internet traffic or inspects HTTP proxy logs.",
      mitigation: "End-to-End Encryption + RFC 3986. Traffic is protected by TLS, payloads are pre-encrypted, and the #key fragment is never transmitted over the network.",
      status: "Immune",
    },
    {
      threat: "Chat Log / Link Interception (Slack, Email, Discord)",
      description: "The secret link is sent through an unencrypted channel and intercepted by a third party.",
      mitigation: "Dual-Layer Passphrase (PBKDF2). If passphrase protection is enabled, possessing the link alone is useless without the out-of-band passphrase.",
      status: "Protected with Passphrase",
    },
    {
      threat: "Simultaneous Multi-Reader Race Condition",
      description: "Two users or bots click the one-time link at the exact same millisecond.",
      mitigation: "Atomic Redis GETDEL. Redis processes commands sequentially. The first connection receives the ciphertext and deletes the key; the second connection receives a 404.",
      status: "Zero-Race Guarantee",
    },
    {
      threat: "Cross-Site Scripting (XSS) / Code Injection",
      description: "Malicious scripts attempt to inspect DOM or extract encryption keys.",
      mitigation: "Strict Content Security Policy (CSP). Disallows unsafe-eval, restricts script origins, enforces Referrer-Policy: no-referrer, and denies framing.",
      status: "Hardened by CSP",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] glass-panel rounded-3xl border border-gunmetal/80 shadow-2xl flex flex-col overflow-hidden text-ghost"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gunmetal/60 bg-abyss/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-accent/10 border border-cyan-accent/20">
              <Cpu className="w-5 h-5 text-cyan-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ivory flex items-center gap-2">
                Under The Hood: Cryptographic Architecture
              </h2>
              <p className="text-xs text-ash">
                Zero-Knowledge Proof of Security and Technical Specifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ash hover:text-ivory bg-obsidian/60 hover:bg-gunmetal border border-gunmetal/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gunmetal/40 px-6 bg-abyss/40 overflow-x-auto">
          {[
            { id: "architecture", label: "End-to-End Pipeline", icon: Cpu },
            { id: "threat-model", label: "Threat Model & Defense", icon: Shield },
            { id: "crypto-code", label: "Web Crypto Code", icon: Code2 },
            { id: "specifications", label: "Security Specs", icon: FileCode },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabType)}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === id
                  ? "border-cyan-accent text-cyan-accent bg-cyan-accent/5"
                  : "border-transparent text-smoke hover:text-ivory hover:border-steel"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ─── TAB 1: ARCHITECTURE PIPELINE ─────────────────────── */}
          {activeTab === "architecture" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                {steps.map((step, idx) => {
                  const StepIcon = step.icon;
                  const isSelected = activeStep === idx;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveStep(idx)}
                      className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? `${step.bg} ${step.border} shadow-lg shadow-cyan-accent/5`
                          : "bg-abyss/40 border-gunmetal/40 hover:border-steel"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold text-ash">
                          STEP 0{idx + 1}
                        </span>
                        <StepIcon className={`w-4 h-4 ${step.color}`} />
                      </div>
                      <div className="text-xs font-bold text-ivory line-clamp-1">
                        {step.title.split(". ")[1]}
                      </div>
                      <div className="text-[11px] text-ash mt-0.5 line-clamp-1">
                        {step.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Step Expanded Details */}
              <div
                className={`p-6 rounded-2xl border ${steps[activeStep].bg} ${steps[activeStep].border} animate-fade-in`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const CurrentIcon = steps[activeStep].icon;
                    return (
                      <div className="p-2 rounded-xl bg-abyss border border-gunmetal/60">
                        <CurrentIcon className={`w-5 h-5 ${steps[activeStep].color}`} />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="text-base font-bold text-ivory">
                      {steps[activeStep].title}
                    </h3>
                    <p className="text-xs text-smoke">
                      {steps[activeStep].subtitle}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {steps[activeStep].details.map((point, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs leading-relaxed text-ghost">
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-accent flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sequence Flow Diagram Summary */}
              <div className="glass-panel rounded-2xl p-5 border border-gunmetal/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-smoke mb-3">
                  Zero-Knowledge Data Flow
                </h4>
                <div className="bg-abyss/80 rounded-xl p-4 font-mono text-[11px] text-ash space-y-2 border border-gunmetal/40 overflow-x-auto">
                  <p className="text-cyan-accent">
                    [Sender Browser] --(AES-GCM-256)-&gt; Ciphertext + Key(#)
                  </p>
                  <p className="text-ghost">
                    [Sender Browser] --(POST Ciphertext Only)-&gt; [Next.js Edge] --(SET EX ttl)-&gt; [Upstash Redis]
                  </p>
                  <p className="text-violet-link">
                    [Sender] ==(Shares URL with #key in Fragment)==&gt; [Recipient]
                  </p>
                  <p className="text-ember-glow">
                    [Recipient] --(GET /api/secrets/id)-&gt; [Next.js Edge] --(GETDEL)-&gt; [Upstash Redis (Deleted!)]
                  </p>
                  <p className="text-teal-success">
                    [Recipient Browser] &lt;--(Decrypts in RAM with #key + Passphrase)-- Plaintext
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: THREAT MODEL & DEFENSE ───────────────────── */}
          {activeTab === "threat-model" && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-smoke">
                A formal security threat model detailing attack vectors and their mathematical and architectural mitigations:
              </p>

              <div className="space-y-3">
                {threatScenarios.map((item, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-abyss/60 border border-gunmetal/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-ivory flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-cyan-accent" />
                        {item.threat}
                      </h4>
                      <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-teal-success/10 text-teal-success border border-teal-success/20">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-ash">
                      <strong>Scenario:</strong> {item.description}
                    </p>
                    <p className="text-xs text-ghost bg-obsidian/80 p-3 rounded-xl border border-gunmetal/40 leading-relaxed">
                      <strong className="text-cyan-accent font-medium">Defense Mechanism:</strong>{" "}
                      {item.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB 3: WEB CRYPTO API CODE ──────────────────────── */}
          {activeTab === "crypto-code" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-xs text-smoke">
                  Exact cryptographic primitives running in the client browser:
                </p>
                <span className="text-[11px] font-mono text-cyan-accent bg-cyan-accent/10 px-2.5 py-1 rounded-lg border border-cyan-accent/20">
                  lib/crypto.ts
                </span>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl bg-abyss border border-gunmetal/60 overflow-hidden">
                  <div className="px-4 py-2.5 bg-obsidian border-b border-gunmetal/40 flex items-center justify-between">
                    <span className="text-xs font-mono text-ghost font-semibold">
                      1. Client Key Generation (AES-GCM-256)
                    </span>
                  </div>
                  <pre className="p-4 text-xs font-mono text-cyan-accent/90 overflow-x-auto leading-relaxed">
{`const key = await window.crypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 },
  true, // Extractable for the URL hash
  ["encrypt", "decrypt"]
);`}
                  </pre>
                </div>

                <div className="rounded-2xl bg-abyss border border-gunmetal/60 overflow-hidden">
                  <div className="px-4 py-2.5 bg-obsidian border-b border-gunmetal/40 flex items-center justify-between">
                    <span className="text-xs font-mono text-ghost font-semibold">
                      2. Optional Passphrase Key Derivation (PBKDF2-HMAC-SHA256)
                    </span>
                  </div>
                  <pre className="p-4 text-xs font-mono text-amber-warn/90 overflow-x-auto leading-relaxed">
{`const passKey = await window.crypto.subtle.deriveKey(
  {
    name: "PBKDF2",
    salt: crypto.getRandomValues(new Uint8Array(16)),
    iterations: 100_000,
    hash: "SHA-256",
  },
  keyMaterial,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt", "decrypt"]
);`}
                  </pre>
                </div>

                <div className="rounded-2xl bg-abyss border border-gunmetal/60 overflow-hidden">
                  <div className="px-4 py-2.5 bg-obsidian border-b border-gunmetal/40 flex items-center justify-between">
                    <span className="text-xs font-mono text-ghost font-semibold">
                      3. Atomic Server Retrieval & Burn (Redis GETDEL)
                    </span>
                  </div>
                  <pre className="p-4 text-xs font-mono text-ember-glow/90 overflow-x-auto leading-relaxed">
{`// Atomic read and delete: eliminates TOCTOU race conditions
const encryptedPayload = await redis.getdel<string>("secret:" + id);
if (!encryptedPayload) return NextResponse.json({ error: "Burned" }, { status: 404 });`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 4: SPECIFICATIONS ───────────────────────────── */}
          {activeTab === "specifications" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    title: "Symmetric Encryption",
                    value: "AES-GCM (Galois/Counter Mode) 256-bit",
                  },
                  {
                    title: "Initialization Vector (IV)",
                    value: "96-bit (12-byte) CSPRNG per encryption",
                  },
                  {
                    title: "Passphrase Key Derivation",
                    value: "PBKDF2-HMAC-SHA256 (100,000 rounds)",
                  },
                  {
                    title: "KDF Salt Length",
                    value: "128-bit (16-byte) Cryptographic Salt",
                  },
                  {
                    title: "Atomic Deletion Method",
                    value: "Single-thread Redis GETDEL command",
                  },
                  {
                    title: "Key Transmission Standard",
                    value: "RFC 3986 Section 3.5 URI Hash Fragment",
                  },
                  {
                    title: "Rate Limiting Architecture",
                    value: "Sliding window limiter via @upstash/ratelimit",
                  },
                  {
                    title: "Security Headers Policy",
                    value: "Strict CSP, No-Referrer, HSTS, Frame DENY",
                  },
                ].map((spec, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-abyss/60 border border-gunmetal/40"
                  >
                    <div className="text-[11px] uppercase tracking-wider text-ash font-medium mb-1">
                      {spec.title}
                    </div>
                    <div className="text-xs font-mono font-semibold text-ivory">
                      {spec.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-cyan-accent/5 border border-cyan-accent/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-5 h-5 text-cyan-accent" />
                  <div className="text-xs">
                    <strong className="text-ivory">Open Cryptographic Architecture</strong>
                    <p className="text-ash">All cryptography is auditable directly via native browser standards.</p>
                  </div>
                </div>
                <a
                  href="https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-cyan-accent hover:underline"
                >
                  MDN Spec
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-abyss/80 border-t border-gunmetal/60 flex items-center justify-between text-xs text-ash">
          <span>Zero-Knowledge Encryption Standard</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gunmetal hover:bg-steel text-ivory font-medium transition-colors cursor-pointer"
          >
            Close Deep Dive
          </button>
        </div>
      </div>
    </div>
  );
}
