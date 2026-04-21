import { getAppSettings } from "@/lib/db/settings-queries";
import type { Metadata } from "next";
import { SenderTab } from "../tabs/resend-tab";

export const metadata: Metadata = { title: "Impostazioni / Resend" };

export default async function SettingsSenderPage() {
  const settings = await getAppSettings();
  return <SenderTab settings={settings} />;
}
