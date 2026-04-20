import { getAppSettings } from "@/lib/db/settings-queries";
import type { Metadata } from "next";
import { EmailTab } from "../tabs/email-tab";

export const metadata: Metadata = { title: "Impostazioni / Email" };

export default async function SettingsEmailPage() {
  const settings = await getAppSettings();
  return <EmailTab settings={settings} />;
}
