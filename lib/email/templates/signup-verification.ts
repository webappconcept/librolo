// lib/email/templates/signup-verification.ts
import { sendEmail } from "@/lib/email/resend";

export async function sendSignupVerificationEmail(
  to: string,
  code: string,
  firstName?: string,
): Promise<void> {
  const displayName = firstName ?? "";
  const greeting = displayName ? `Ciao, ${displayName}!` : "Ciao!";

  const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verifica la tua email</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0f766e;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Librolo</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">${greeting}</p>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">Grazie per esserti registrato su Librolo. Inserisci il codice qui sotto per verificare il tuo indirizzo email e completare la registrazione.</p>
              <!-- OTP box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:#f0fdf4;border:2px solid #0f766e;border-radius:12px;padding:20px 40px;">
                      <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Codice di verifica</p>
                      <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.25em;color:#0f766e;font-family:monospace;">${code}</p>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;">&#9201; Il codice &egrave; valido per <strong>20 minuti</strong>.</p>
              <p style="margin:0;font-size:13px;color:#9ca3af;">Se non hai richiesto questa registrazione, puoi ignorare questa email.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Librolo &middot; Tutti i diritti riservati</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const { error } = await sendEmail({
    to,
    subject: `${code} è il tuo codice di verifica Librolo`,
    html,
  });

  if (error) {
    console.error("[signup-verification] Resend error:", error);
  }
}
