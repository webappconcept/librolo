import { getAppSettings } from "@/lib/db/settings-queries";
import type { Metadata } from "next";
import { ComportamentoTab } from "../tabs/comportamento-tab";

export const metadata: Metadata = { title: "Impostazioni / Comportamento" };

export default async function SettingsComportamentoPage() {
  const settings = await getAppSettings();
  return <ComportamentoTab settings={settings} />;
}
