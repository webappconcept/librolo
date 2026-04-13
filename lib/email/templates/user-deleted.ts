// lib/email/templates/user-deleted.ts
import { getAppSettings } from "@/lib/db/settings-queries";
import { sendEmail } from "@/lib/email/resend";
import { emailTheme as t } from "@/lib/email/theme";

export async function sendUserDeletedEmail(
  to: string,
  firstName: string | null,
  deletedAt: Date,
) {
  const settings = await getAppSettings();
  const { app_name } = settings;
  const greeting = firstName ? `Ciao ${firstName},` : "Ciao,";
  const formattedDate = deletedAt.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const vars = {
    appName: app_name,
    userEmail: to,
    userName: firstName ?? "",
    deletedDate: formattedDate,
  };

  const subject = resolveTemplate(
    settings.email_deleted_subject,
    `Il tuo account \u00e8 stato eliminato \u2014 ${app_name}`,
    vars,
  );
  const bcc = settings.email_deleted_bcc ?? undefined;
  const bodyText = resolveTemplate(settings.email_deleted_body, null, vars);
  const footerText = resolveTemplate(
    settings.email_deleted_footer,
    `\u00a9 ${new Date().getFullYear()} ${app_name} \u00b7 Tutti i diritti riservati`,
    vars,
  );

  await sendEmail({
    to,
    bcc,
    subject,
    html: buildHtml({ greeting, formattedDate, bodyText, footerText, appName: app_name }),
  });
}

function resolveTemplate(
  stored: string | null,
  fallback: string | null,
  vars: Record<string, string>,
): string {
  const tpl = stored?.trim() || fallback || "";
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function buildHtml({
  greeting,
  formattedDate,
  bodyText,
  footerText,
  appName,
}: {
  greeting: string;
  formattedDate: string;
  bodyText: string;
  footerText: string;
  appName: string;
}): string {
  const bodyHtml = bodyText
    ? bodyText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `<p style="margin:0 0 12px;color:${t.textMuted};font-size:15px;line-height:1.6;">${l}</p>`)
        .join("")
    : `
      <p style="margin:0 0 24px;color:${t.textMuted};font-size:15px;line-height:1.6;">
        Ti informiamo che il tuo account <strong>${appName}</strong> \u00e8 stato
        <strong>eliminato definitivamente</strong> in data
        <strong>${formattedDate}</strong> da un amministratore della piattaforma.
      </p>
      <p style="margin:0 0 32px;color:${t.textMuted};font-size:15px;line-height:1.6;">
        I tuoi dati personali sono stati rimossi dai sistemi attivi.
        Se ritieni che questa operazione sia avvenuta per errore, contatta il nostro supporto.
      </p>`;

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
          <tr>
            <td style="background:${t.brandPrimary};padding:32px 40px;">
              <h1 style="margin:0;color:${t.textInverse};font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                \uD83D\uDCDA ${appName}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;color:${t.textPrimary};font-size:16px;">${greeting}</p>
              ${bodyHtml}
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
          <tr>
            <td style="background:${t.bgPage};padding:20px 40px;border-top:1px solid ${t.border};">
              <p style="margin:0;color:${t.textLight};font-size:12px;">${footerText}</p>
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
