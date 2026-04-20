// app/(admin)/admin/settings/email/page.tsx
import { getAppSettings } from "@/lib/db/settings-queries";
import { EmailTemplatesTab } from "../tabs/email-templates-tab";

export default async function SettingsEmailPage() {
  const settings = await getAppSettings();
  return <EmailTemplatesTab settings={settings} />;
}
