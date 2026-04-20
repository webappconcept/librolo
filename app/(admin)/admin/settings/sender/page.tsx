// app/(admin)/admin/settings/sender/page.tsx
import { getAppSettings } from "@/lib/db/settings-queries";
import { SenderTab } from "../tabs/sender-tab";

export default async function SettingsSenderPage() {
  const settings = await getAppSettings();
  return <SenderTab settings={settings} />;
}
