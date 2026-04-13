// lib/email/templates/welcome.ts
import { getAppSettings } from "@/lib/db/settings-queries";
import { sendEmail } from "@/lib/email/resend";
import { emailTheme as t } from "@/lib/email/theme";

export async function sendWelcomeEmail(to: string, userName?: string) {
  const settings = await getAppSettings();
  const { app_name } = settings;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const greeting = userName ? `Ciao ${userName},` : "Ciao,";

  const subject = resolveTemplate(
    settings.email_welcome_subject,
    `Benvenuto in ${app_name}`,
    { appName: app_name, userEmail: to, userName: userName ?? "", appUrl },
  );
  const bcc = settings.email_welcome_bcc ?? undefined;
  const bodyText = resolveTemplate(
    settings.email_welcome_body,
    null,
    { appName: app_name, userEmail: to, userName: userName ?? "", appUrl },
  );
  const footerText = resolveTemplate(
    settings.email_welcome_footer,
    `© ${new Date().getFullYear()} ${app_name} · Tutti i diritti riservati`,
    { appName: app_name, userEmail: to, userName: userName ?? "", appUrl },
  );

  await sendEmail({
    to,
    bcc,
    subject,
    html: buildHtml({ greeting, bodyText, footerText, appName: app_name, appUrl }),
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
  bodyText,
  footerText,
  appName,
  appUrl,
}: {
  greeting: string;
  bodyText: string;
  footerText: string;
  appName: string;
  appUrl: string;
}): string {
  const bodyHtml = bodyText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px;color:${t.textMuted};font-size:15px;line-height:1.6;">${line}</p>`)
    .join("");

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Benvenuto</title>
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
              <p style="margin:0 0 20px;color:${t.textPrimary};font-size:16px;">${greeting}</p>
              ${bodyHtml}
              ${appUrl ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}"
                      style="display:inline-block;background:${t.brandPrimary};color:${t.textInverse};font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:${t.radiusXl};">
                      Accedi alla piattaforma
                    </a>
                  </td>
                </tr>
              </table>` : ""}
            </td>
          </tr>

          <!-- Footer -->
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
