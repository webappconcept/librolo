// lib/email/templates/signup-verification.ts
import { getAppSettings } from "@/lib/db/settings-queries";
import { sendEmail } from "@/lib/email/resend";
import { emailTheme as t } from "@/lib/email/theme";

export async function sendSignupVerificationEmail(
  to: string,
  code: string,
  userName?: string,
) {
  const { app_name } = await getAppSettings();

  await sendEmail({
    to,
    subject: `Verifica la tua email — ${app_name}`,
    html: buildHtml(code, userName, app_name),
  });
}

function buildHtml(code: string, name?: string, appName = "Librolo"): string {
  const greeting = name ? `Ciao ${name},` : "Ciao,";
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verifica email</title>
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
                📚 ${appName}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;color:${t.textPrimary};font-size:16px;">${greeting}</p>
              <p style="margin:0 0 32px;color:${t.textMuted};font-size:15px;line-height:1.6;">
                Usa il codice qui sotto per verificare il tuo account.
                Il codice è valido per <strong>15 minuti</strong>.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 32px;">
                    <div style="
                      display:inline-block;
                      background:${t.bgPage};
                      border:2px solid ${t.border};
                      border-radius:${t.radiusLg};
                      padding:24px 48px;
                    ">
                      <span style="
                        font-size:40px;
                        font-weight:800;
                        letter-spacing:10px;
                        color:${t.brandPrimary};
                        font-family:'Courier New',monospace;
                      ">${code}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:${t.textLight};font-size:13px;line-height:1.5;">
                Se non hai creato un account, puoi ignorare questa email.<br/>
                Non condividere questo codice con nessuno.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${t.bgPage};padding:20px 40px;border-top:1px solid ${t.border};">
              <p style="margin:0;color:${t.textLight};font-size:12px;">
                © ${new Date().getFullYear()} ${appName} · Tutti i diritti riservati
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
