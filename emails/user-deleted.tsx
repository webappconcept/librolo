// emails/user-deleted.tsx
// Template HTML puro — nessuna dipendenza esterna.
// Compatibile con Resend passando { html } invece di { react }.

export interface UserDeletedEmailProps {
  firstName: string;
  deletedAt: Date;
}

export function renderUserDeletedEmail({
  firstName,
  deletedAt,
}: UserDeletedEmailProps): string {
  const formattedDate = deletedAt.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const year = deletedAt.getFullYear();

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account eliminato</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Account eliminato</h2>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#555;">Ciao ${firstName},</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#555;">
                Ti informiamo che il tuo account Librolo &egrave; stato
                <strong>eliminato definitivamente</strong> in data
                <strong>${formattedDate}</strong> da un amministratore della piattaforma.
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">
                I tuoi dati personali sono stati rimossi dai sistemi attivi.
                Se ritieni che questa operazione sia avvenuta per errore,
                contatta il nostro supporto.
              </p>

              <!-- Alert box -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;font-size:13px;color:#b91c1c;">
                      Se non riconosci questa operazione, rispondi a questa email
                      o scrivici a <a href="mailto:support@librolo.it" style="color:#b91c1c;">support@librolo.it</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;font-size:12px;color:#aaa;">
              &copy; ${year} Librolo &mdash; Tutti i diritti riservati
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
