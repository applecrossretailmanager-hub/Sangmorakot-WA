import "server-only";

/**
 * Verifies a reCAPTCHA v2 token against Google's siteverify endpoint.
 * If RECAPTCHA_SECRET_KEY isn't configured yet, verification is skipped
 * (returns true) so the contact form still works before the site owner
 * has created reCAPTCHA keys — once the key is set, protection turns on
 * automatically with no code change.
 */
export async function verifyRecaptcha(token: string | null | undefined) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn("RECAPTCHA_SECRET_KEY is not set; skipping captcha verification.");
    return true;
  }
  if (!token) return false;

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  if (!res.ok) return false;
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
