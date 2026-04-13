// lib/email/resend.ts
import { getEmailFrom, getResendClient } from "./client";

export async function sendEmail({
  to,
  bcc,
  subject,
  html,
}: {
  to: string;
  bcc?: string;
  subject: string;
  html: string;
}) {
  const resend = await getResendClient();
  const from = await getEmailFrom();

  return resend.emails.send({
    from,
    to,
    ...(bcc ? { bcc } : {}),
    subject,
    html,
  });
}
