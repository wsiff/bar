# 🔥 ZKSS — Burn After Reading

**Zero-knowledge, self-destructing secret sharing.** Share secrets that can only be viewed once, then vanish forever.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

- **True zero-knowledge** — Encryption happens entirely in your browser. The server only ever stores ciphertext and never sees your plaintext or keys.
- **Burn after reading** — Secrets are atomically read and deleted (`GETDEL`). One view, then gone.
- **AES-256-GCM encryption** — Industry-standard authenticated encryption via the Web Crypto API.
- **URL fragment key delivery** — The decryption key lives in the URL hash (`#key`), which [is never sent to the server](https://datatracker.ietf.org/doc/html/rfc3986#section-3.5).
- **Optional passphrase protection** — Add a second encryption layer with PBKDF2 key derivation for out-of-band passphrase verification.
- **Auto-wipe from memory** — After revealing, a 60-second countdown wipes the plaintext from browser memory. Or hit "Wipe Now" immediately.
- **Time-limited storage** — Choose 1 hour, 24 hours, or 7 days. Secrets auto-expire from Redis even if never read.
- **Rate limiting** — Sliding-window rate limits on create and read endpoints prevent abuse.
- **Hardened security headers** — CSP, HSTS, X-Frame-Options, Referrer-Policy, and more configured out of the box.

## How It Works

```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   Sender    │        │   Server    │        │  Recipient  │
│  (Browser)  │        │  (API/Redis)│        │  (Browser)  │
└──────┬──────┘        └──────┬──────┘        └──────┬──────┘
       │                      │                      │
       │  1. Generate AES key │                      │
       │  2. Encrypt secret   │                      │
       │                      │                      │
       │  POST /api/secrets   │                      │
       │  { ciphertext }      │                      │
       │─────────────────────►│                      │
       │                      │  3. Store in Redis   │
       │     { id }           │     with TTL         │
       │◄─────────────────────│                      │
       │                      │                      │
       │  4. Build share URL: │                      │
       │  /secret/{id}#key    │                      │
       │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ►│
       │                      │                      │
       │                      │  GET /api/secrets/id │
       │                      │◄─────────────────────│
       │                      │                      │
       │                      │  5. GETDEL ciphertext│
       │                      │  (read + delete)     │
       │                      │                      │
       │                      │  { ciphertext }      │
       │                      │─────────────────────►│
       │                      │                      │
       │                      │  6. Decrypt with key │
       │                      │     from URL #hash   │
       │                      │  7. Auto-wipe (60s)  │
```

**The server never sees the plaintext or the encryption key.** The key only exists in the URL fragment, which per RFC 3986 is never transmitted over HTTP.

## Tech Stack

- **Framework** — [Next.js](https://nextjs.org/) 16 (App Router)
- **Encryption** — [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) (AES-256-GCM + PBKDF2)
- **Database** — [Upstash Redis](https://upstash.com/) (serverless, with TTL expiration)
- **Rate Limiting** — [@upstash/ratelimit](https://github.com/upstash/ratelimit) (sliding window)
- **Styling** — [Tailwind CSS](https://tailwindcss.com/) v4
- **Icons** — [Lucide React](https://lucide.dev/)
- **Language** — TypeScript

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- An [Upstash Redis](https://console.upstash.com/) database (free tier works)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/wsiff/zkss.git
   cd zkss
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and fill in your Upstash Redis credentials:

   ```env
   UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── secrets/
│   │       ├── route.ts          # POST — create encrypted secret
│   │       └── [id]/route.ts     # GET  — read & burn secret
│   ├── secret/
│   │   └── [id]/page.tsx         # Secret viewer / decryption page
│   ├── globals.css               # Tailwind theme & animations
│   ├── layout.tsx                # Root layout & metadata
│   └── page.tsx                  # Home page / secret composer
├── components/
│   └── TechnicalDeepDive.tsx     # Crypto architecture explainer
└── lib/
    ├── constants.ts              # TTL options & Redis key prefix
    ├── crypto.ts                 # AES-256-GCM + PBKDF2 encryption
    ├── ratelimit.ts              # Sliding-window rate limiters
    └── redis.ts                  # Upstash Redis client singleton
```

## Security

This project is designed with security as a first-class concern:

| Layer | Implementation |
|---|---|
| **Encryption** | AES-256-GCM authenticated encryption via Web Crypto API |
| **Key Derivation** | PBKDF2 with 600,000 iterations (SHA-256) for passphrase-protected secrets |
| **Key Transport** | URL fragment (`#`) — never sent to server per RFC 3986 |
| **Storage** | Ciphertext-only in Redis with automatic TTL expiration |
| **Deletion** | Atomic `GETDEL` — read and delete in a single operation |
| **Rate Limiting** | Sliding window: 10 creates/min, 30 reads/min per IP |
| **Headers** | CSP, HSTS, X-Frame-Options DENY, no-referrer, Permissions-Policy |
| **Memory** | Auto-wipe plaintext from browser memory after 60 seconds |

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the [MIT License](LICENSE).
