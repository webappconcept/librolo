import { getAppSettings } from "@/lib/db/settings-queries";
import type { Metadata } from "next";
import { RedisTab } from "../tabs/redis-tab";

export const metadata: Metadata = { title: "Impostazioni / Redis" };

export default async function SettingsRedisPage() {
  const settings = await getAppSettings();
  return <RedisTab settings={settings} />;
}
