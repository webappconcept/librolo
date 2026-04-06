// lib/email/resend.ts
import { getEmailFrom, getResendClient } from "./client";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = await getResendClient();
  const from = await getEmailFrom();

  return resend.emails.send({ from, to, subject, html });
}
