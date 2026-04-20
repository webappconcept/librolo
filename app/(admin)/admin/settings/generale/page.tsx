import { getAppSettings } from "@/lib/db/settings-queries";
import type { Metadata } from "next";
import { GeneraleTab } from "../tabs/generale-tab";

export const metadata: Metadata = { title: "Impostazioni / Generale" };

export default async function SettingsGeneralePage() {
  const settings = await getAppSettings();
  return <GeneraleTab settings={settings} />;
}
