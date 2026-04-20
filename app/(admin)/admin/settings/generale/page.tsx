// app/(admin)/admin/settings/generale/page.tsx
import { getAppSettings } from "@/lib/db/settings-queries";
import { GeneralTab } from "../tabs/general-tab";

export default async function SettingsGeneralePage() {
  const settings = await getAppSettings();
  return <GeneralTab settings={settings} />;
}
