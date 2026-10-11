"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WAIVER_TEXT, WAIVER_VERSION } from "@/lib/waiver";

const STEPS = ["Your details", "Emergency & health", "Terms & waiver"] as const;

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/membership";

  const [step, setStep] = useState(0);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [injuries, setInjuries] = useState("");
  const [agreedToWaiver, setAgreedToWaiver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  function goNext(e: FormEvent) {
    e.preventDefault();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

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
          emergency_contact_name: emergencyContactName,
          emergency_contact_phone: emergencyContactPhone,
          emergency_contact_relationship: emergencyContactRelationship,
          medical_conditions: medicalConditions,
          injuries,
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
      <p className="text-muted mb-6">Sign up to pick a membership or book personal training.</p>

      <ol className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                i <= step ? "bg-gold" : "bg-border"
              }`}
            />
            <p className={`mt-1.5 text-xs ${i === step ? "text-gold" : "text-muted"}`}>
              {i + 1}. {label}
            </p>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form onSubmit={goNext} className="space-y-4">
          <Field label="Full name">
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              autoComplete="name"
              autoFocus
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

          <button type="submit" className="w-full btn-primary py-2.5">
            Continue
          </button>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={goNext} className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gold mb-1">Emergency Contact</h2>
            <p className="text-xs text-muted mb-3">
              Someone we can call if you&rsquo;re injured during a class or session.
            </p>
            <div className="space-y-4">
              <Field label="Emergency contact name">
                <input
                  required
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="input"
                  autoComplete="name"
                  autoFocus
                />
              </Field>
              <Field label="Emergency contact phone">
                <input
                  required
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="input"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Relationship to you">
                <input
                  required
                  placeholder="e.g. Partner, Parent, Friend"
                  value={emergencyContactRelationship}
                  onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gold mb-1">Health Information</h2>
            <p className="text-xs text-muted mb-3">
              So instructors know how to train with you safely. Write &ldquo;None&rdquo; if not
              applicable.
            </p>
            <div className="space-y-4">
              <Field label="Medical conditions, allergies or medications">
                <textarea
                  required
                  rows={2}
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  className="input resize-y"
                />
              </Field>
              <Field label="Current injuries or physical limitations">
                <textarea
                  required
                  rows={2}
                  value={injuries}
                  onChange={(e) => setInjuries(e.target.value)}
                  className="input resize-y"
                />
              </Field>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={goBack} className="btn-outline flex-1 py-2.5">
              Back
            </button>
            <button type="submit" className="btn-primary flex-1 py-2.5">
              Continue
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={onSubmit} className="space-y-4">
          <details className="rounded-md border border-border bg-surface" open>
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

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={goBack} className="btn-outline flex-1 py-2.5">
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !agreedToWaiver}
              className="flex-1 rounded-md bg-primary py-2.5 font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </div>
        </form>
      )}

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
