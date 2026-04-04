// lib/email/templates/password-reset.ts
import { resend } from "@/lib/email/resend";
import { emailTheme as t } from "@/lib/email/theme";

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  userName?: string,
) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  const greeting = userName ? `Ciao ${userName},` : "Ciao,";

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: "Reimposta la tua password — Librolo",
    html: buildHtml(resetUrl, greeting),
    text: `Reimposta la tua password Librolo: ${resetUrl}\nIl link scade tra 30 minuti.`,
  });

  if (error) throw new Error(`Errore invio email: ${error.message}`);
}

function buildHtml(resetUrl: string, greeting: string): string {
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reimposta password</title>
</head>
<body style="margin:0;padding:0;background:${t.bgPage};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${t.bgPage};padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
          style="background:${t.bgCard};border-radius:${t.radiusXl};overflow:hidden;border:1px solid ${t.border};">

          <!-- Header -->
          <tr>
            <td style="background:${t.brandPrimary};padding:32px 40px;">
              <h1 style="margin:0;color:${t.textInverse};font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                📚 Librolo
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;color:${t.textPrimary};font-size:16px;">${greeting}</p>
              <p style="margin:0 0 32px;color:${t.textMuted};font-size:15px;line-height:1.6;">
                Hai richiesto di reimpostare la password del tuo account Librolo.
                Clicca il pulsante qui sotto per procedere.
                Il link è valido per <strong>30 minuti</strong>.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 32px;">
                    <a href="${resetUrl}"
                      style="
                        display:inline-block;
                        background:${t.brandPrimary};
                        color:${t.textInverse};
                        font-size:15px;
                        font-weight:700;
                        text-decoration:none;
                        padding:14px 32px;
                        border-radius:${t.radiusXl};
                      ">
                      Reimposta password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:0 0 24px;color:${t.textLight};font-size:12px;line-height:1.5;">
                Se il pulsante non funziona, copia e incolla questo link nel browser:<br/>
                <a href="${resetUrl}" style="color:${t.brandPrimary};word-break:break-all;">${resetUrl}</a>
              </p>

              <p style="margin:0;color:${t.textLight};font-size:13px;line-height:1.5;">
                Se non hai richiesto il reset della password, puoi ignorare questa email.
                Il tuo account è al sicuro.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${t.bgPage};padding:20px 40px;border-top:1px solid ${t.border};">
              <p style="margin:0;color:${t.textLight};font-size:12px;">
                © ${new Date().getFullYear()} Librolo · Tutti i diritti riservati
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
