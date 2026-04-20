// app/(admin)/admin/settings/redis/page.tsx
import { getAppSettings } from "@/lib/db/settings-queries";
import { RedisTab } from "../tabs/redis-tab";

export default async function SettingsRedisPage() {
  const settings = await getAppSettings();
  return <RedisTab settings={settings} />;
}
