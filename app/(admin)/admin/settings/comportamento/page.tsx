import { getAppSettings } from "@/lib/db/settings-queries";
import type { Metadata } from "next";
import { BehaviourTab } from "../tabs/behaviour-tab";

export const metadata: Metadata = { title: "Impostazioni / Comportamento" };

export default async function SettingsComportamentoPage() {
  const settings = await getAppSettings();
  return <BehaviourTab settings={settings} />;
}
