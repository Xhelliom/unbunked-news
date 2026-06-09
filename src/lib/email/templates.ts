// Transactional email content. These run in BetterAuth hooks, outside any
// next-intl request context, so the copy lives here as a small bilingual
// dictionary (FR primary, EN below) rather than going through next-intl.

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

const BRAND = "Unbunked";

// Minimal, client-safe inline styles. No external CSS, no images.
function layout(headingFr: string, bodyFr: string, ctaLabel: string, url: string, headingEn: string, bodyEn: string): string {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
    <p style="font-weight:700;font-size:18px;margin:0 0 24px">${BRAND}</p>
    <h1 style="font-size:20px;margin:0 0 12px">${headingFr}</h1>
    <p style="font-size:15px;line-height:1.5;margin:0 0 20px">${bodyFr}</p>
    <p style="margin:0 0 28px">
      <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:15px;font-weight:600">${ctaLabel}</a>
    </p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0" />
    <h2 style="font-size:16px;margin:0 0 10px;color:#555">${headingEn}</h2>
    <p style="font-size:14px;line-height:1.5;margin:0 0 16px;color:#555">${bodyEn}</p>
    <p style="font-size:12px;line-height:1.5;color:#999;word-break:break-all">${url}</p>
  </div>`;
}

export function renderVerificationEmail(url: string): EmailContent {
  const ctaFr = "Vérifier mon adresse";
  return {
    subject: `${BRAND} — Vérifiez votre adresse email`,
    html: layout(
      "Vérifiez votre adresse email",
      "Cliquez sur le bouton ci-dessous pour confirmer votre adresse et activer votre compte.",
      ctaFr,
      url,
      "Verify your email address",
      "Click the button above to confirm your address and activate your account.",
    ),
    text: `Unbunked — Vérifiez votre adresse email\n\nOuvrez ce lien pour confirmer votre adresse : ${url}\n\n--\nVerify your email address: ${url}`,
  };
}

export function renderPasswordResetEmail(url: string): EmailContent {
  const ctaFr = "Réinitialiser mon mot de passe";
  return {
    subject: `${BRAND} — Réinitialisation de votre mot de passe`,
    html: layout(
      "Réinitialisez votre mot de passe",
      "Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
      ctaFr,
      url,
      "Reset your password",
      "You requested a password reset. Click the button above. If you didn't request this, ignore this email.",
    ),
    text: `Unbunked — Réinitialisation de votre mot de passe\n\nOuvrez ce lien pour choisir un nouveau mot de passe : ${url}\n\n--\nReset your password: ${url}`,
  };
}
