"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Script from "next/script";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement,
        params: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void },
      ) => number;
      reset: (id?: number) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export function ContactForm() {
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!scriptReady || !SITE_KEY || !widgetRef.current || widgetId.current !== null) return;
    if (!window.grecaptcha) return;
    window.grecaptcha.ready(() => {
      if (!widgetRef.current || widgetId.current !== null || !window.grecaptcha) return;
      widgetId.current = window.grecaptcha.render(widgetRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => setRecaptchaToken(token),
        "expired-callback": () => setRecaptchaToken(""),
      });
    });
  }, [scriptReady]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        message: form.get("message"),
        recaptchaToken,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. Please try again.");
      if (window.grecaptcha && widgetId.current !== null) {
        window.grecaptcha.reset(widgetId.current);
        setRecaptchaToken("");
      }
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="card">
        <p className="font-medium text-gold mb-1">Message sent!</p>
        <p className="text-muted text-sm">
          Thanks for reaching out — we&rsquo;ll get back to you as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      {SITE_KEY && (
        <Script
          src="https://www.google.com/recaptcha/api.js"
          onReady={() => setScriptReady(true)}
        />
      )}
      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">Name</span>
        <input name="name" required className="input" autoComplete="name" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">Email</span>
        <input name="email" type="email" required className="input" autoComplete="email" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">Phone (optional)</span>
        <input name="phone" className="input" autoComplete="tel" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">Message</span>
        <textarea name="message" required rows={4} className="input" />
      </label>

      {SITE_KEY && <div ref={widgetRef} />}

      {error && <p className="text-sm text-primary">{error}</p>}

      <button
        type="submit"
        disabled={loading || (!!SITE_KEY && !recaptchaToken)}
        className="btn-primary disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
