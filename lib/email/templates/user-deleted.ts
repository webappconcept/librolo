// lib/email/templates/user-deleted.ts
import { getAppSettings } from "@/lib/db/settings-queries";
import { sendEmail } from "@/lib/email/resend";
import { emailTheme as t } from "@/lib/email/theme";

export async function sendUserDeletedEmail(
  to: string,
  firstName: string | null,
  deletedAt: Date,
) {
  const { app_name } = await getAppSettings();
  const greeting = firstName ? `Ciao ${firstName},` : "Ciao,";
  const formattedDate = deletedAt.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  await sendEmail({
    to,
    subject: `Il tuo account è stato eliminato — ${app_name}`,
    html: buildHtml(greeting, formattedDate, app_name),
  });
}

function buildHtml(
  greeting: string,
  formattedDate: string,
  appName = "Librolo",
): string {
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account eliminato</title>
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
              <p style="margin:0 0 24px;color:${t.textMuted};font-size:15px;line-height:1.6;">
                Ti informiamo che il tuo account <strong>${appName}</strong> è stato
                <strong>eliminato definitivamente</strong> in data
                <strong>${formattedDate}</strong> da un amministratore della piattaforma.
              </p>
              <p style="margin:0 0 32px;color:${t.textMuted};font-size:15px;line-height:1.6;">
                I tuoi dati personali sono stati rimossi dai sistemi attivi.
                Se ritieni che questa operazione sia avvenuta per errore, contatta il nostro supporto.
              </p>

              <!-- Alert box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;font-size:13px;color:#b91c1c;">
                      Se non riconosci questa operazione, scrivi a
                      <a href="mailto:support@librolo.it" style="color:#b91c1c;">support@librolo.it</a>
                    </p>
                  </td>
                </tr>
              </table>
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
