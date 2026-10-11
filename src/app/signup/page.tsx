"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WAIVER_TEXT, WAIVER_VERSION } from "@/lib/waiver";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/membership";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToWaiver, setAgreedToWaiver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          waiver_version: WAIVER_VERSION,
          waiver_accepted_at: new Date().toISOString(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <div className="container-page py-20 max-w-md">
        <h1 className="text-2xl font-bold mb-3">Check your email</h1>
        <p className="text-muted">
          We&rsquo;ve sent a confirmation link to <strong>{email}</strong>. Click it to activate
          your account, then come back and log in.
        </p>
      </div>
    );
  }

  return (
    <div className="container-page py-16 max-w-md">
      <h1 className="text-3xl font-bold mb-2">Create your account</h1>
      <p className="text-muted mb-8">
        Sign up to pick a membership or book personal training.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name">
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
            autoComplete="name"
          />
        </Field>
        <Field label="Phone">
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input"
            autoComplete="tel"
          />
        </Field>
        <Field label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            autoComplete="email"
          />
        </Field>
        <Field label="Password">
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            autoComplete="new-password"
          />
        </Field>

        <div>
          <details className="rounded-md border border-border bg-surface mb-3">
            <summary className="cursor-pointer select-none px-3 py-2 text-sm text-gold">
              Read Terms &amp; Conditions and Liability Waiver
            </summary>
            <div className="max-h-56 overflow-y-auto scroll-dark border-t border-border px-3 py-3 text-xs text-muted whitespace-pre-line leading-relaxed">
              {WAIVER_TEXT}
            </div>
          </details>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              required
              checked={agreedToWaiver}
              onChange={(e) => setAgreedToWaiver(e.target.checked)}
              className="mt-1"
            />
            <span>
              I have read and agree to the Terms &amp; Conditions and Liability Waiver above.
            </span>
          </label>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading || !agreedToWaiver}
          className="w-full rounded-md bg-primary py-2.5 font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-gold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}
