import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Burn After Reading - Zero-Knowledge Secret Sharing",
  description:
    "Share secrets that self-destruct after a single view. End-to-end encrypted with zero-knowledge architecture: the server never sees your data.",
  keywords: [
    "secret sharing",
    "burn after reading",
    "zero-knowledge",
    "encrypted",
    "self-destruct",
    "one-time secret",
  ],
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        {/* Ambient background effects */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-cyan-accent/5 blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-ember/5 blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-violet-link/3 blur-[160px]" />
        </div>

        <main className="relative z-0 flex min-h-screen flex-col items-center justify-center px-4 py-12">
          {children}
        </main>

        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-gunmetal/50 bg-void/80 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ash">
            <span>
              &copy; {new Date().getFullYear()} <strong className="text-smoke font-medium">Wasif A.K.A Clergyman</strong>
            </span>
            <span className="hidden md:inline text-ash/80">
              Zero-knowledge &middot; Plaintext never touches our servers
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-success animate-pulse" />
              End-to-end encrypted
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
