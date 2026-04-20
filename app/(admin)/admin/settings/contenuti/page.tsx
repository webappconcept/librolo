import { getAppSettings } from "@/lib/db/settings-queries";
import type { Metadata } from "next";
import { ContenutiTab } from "../tabs/contenuti-tab";

export const metadata: Metadata = { title: "Impostazioni / Contenuti" };

export default async function SettingsContenutiPage() {
  const settings = await getAppSettings();
  return <ContenutiTab settings={settings} />;
}
