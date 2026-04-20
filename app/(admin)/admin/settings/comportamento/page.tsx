// app/(admin)/admin/settings/comportamento/page.tsx
import { getAppSettings } from "@/lib/db/settings-queries";
import { BehaviourTab } from "../tabs/behaviour-tab";

export default async function SettingsComportamentoPage() {
  const settings = await getAppSettings();
  return <BehaviourTab settings={settings} />;
}
