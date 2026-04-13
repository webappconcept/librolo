// lib/email/templates/password-reset.ts
import { getAppSettings } from "@/lib/db/settings-queries";
import { sendEmail } from "@/lib/email/resend";
import { emailTheme as t } from "@/lib/email/theme";

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  userName?: string,
) {
  const settings = await getAppSettings();
  const { app_name } = settings;
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  const greeting = userName ? `Ciao ${userName},` : "Ciao,";

  const vars = { appName: app_name, userEmail: to, userName: userName ?? "", resetLink: resetUrl };

  const subject = resolveTemplate(
    settings.email_reset_subject,
    `Reimposta la tua password \u2014 ${app_name}`,
    vars,
  );
  const bcc = settings.email_reset_bcc ?? undefined;
  const bodyText = resolveTemplate(settings.email_reset_body, null, vars);
  const footerText = resolveTemplate(
    settings.email_reset_footer,
    `\u00a9 ${new Date().getFullYear()} ${app_name} \u00b7 Tutti i diritti riservati`,
    vars,
  );

  await sendEmail({
    to,
    bcc,
    subject,
    html: buildHtml({ resetUrl, greeting, bodyText, footerText, appName: app_name }),
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
  resetUrl,
  greeting,
  bodyText,
  footerText,
  appName,
}: {
  resetUrl: string;
  greeting: string;
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
    : `<p style="margin:0 0 32px;color:${t.textMuted};font-size:15px;line-height:1.6;">
        Hai richiesto di reimpostare la password del tuo account ${appName}.
        Clicca il pulsante qui sotto per procedere.
        Il link \u00e8 valido per <strong>30 minuti</strong>.
       </p>`;

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
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${resetUrl}"
                      style="display:inline-block;background:${t.brandPrimary};color:${t.textInverse};font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:${t.radiusXl};">
                      Reimposta password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;color:${t.textLight};font-size:12px;line-height:1.5;">
                Se il pulsante non funziona, copia e incolla questo link nel browser:<br/>
                <a href="${resetUrl}" style="color:${t.brandPrimary};word-break:break-all;">${resetUrl}</a>
              </p>
              <p style="margin:0;color:${t.textLight};font-size:13px;line-height:1.5;">
                Se non hai richiesto il reset della password, puoi ignorare questa email.
                Il tuo account \u00e8 al sicuro.
              </p>
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
