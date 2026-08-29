import "server-only";
import { site } from "@/lib/site";

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set; skipping email send.");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${site.name} <noreply@sangmorakotwa.com>`,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    console.error("Resend email failed", res.status, await res.text().catch(() => ""));
  }
}

function wrapEmail(bodyHtml: string) {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #17171b;">
      <h1 style="font-size: 18px; margin-bottom: 16px;">${site.name}</h1>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #71717a;">
        ${site.name} · questions? reply to this email or contact us at ${site.email}
      </p>
    </div>
  `;
}

export function ptPackagePaidEmail(packageName: string, sessionCount: number) {
  return wrapEmail(`
    <p>Your payment for <strong>${packageName}</strong> has cleared — ${sessionCount} session${
      sessionCount === 1 ? "" : "s"
    } have been added to your account.</p>
    <p>You can book a time now from your account page.</p>
  `);
}

export function ptPackageFailedEmail(packageName: string) {
  return wrapEmail(`
    <p>Your payment for <strong>${packageName}</strong> didn&rsquo;t go through, so no sessions
    were added to your account.</p>
    <p>This can happen if a bank debit is declined. No charge was made — please try purchasing
    again, or pay cash at the gym instead.</p>
  `);
}

export function membershipPaymentFailedEmail(planName: string) {
  return wrapEmail(`
    <p>We weren&rsquo;t able to process your latest payment for your <strong>${planName}</strong>
    membership.</p>
    <p>Please log in and update your payment details from your account page to keep your
    membership active.</p>
  `);
}
