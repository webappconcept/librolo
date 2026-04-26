import { getAppSettings } from "@/lib/db/settings-queries";
import type { Metadata } from "next";
import { GoogleOAuthTab } from "../tabs/google-oauth-tab";

export const metadata: Metadata = { title: "Impostazioni / Google OAuth" };

export default async function SettingsGoogleOAuthPage() {
  const settings = await getAppSettings();
  return <GoogleOAuthTab settings={settings} />;
}
