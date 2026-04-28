import { getAppSettings } from "@/lib/db/settings-queries";
import type { Metadata } from "next";
import { GitHubCITab } from "../tabs/github-ci-tab";

export const metadata: Metadata = { title: "Impostazioni / GitHub CI" };

export default async function SettingsGitHubPage() {
  const settings = await getAppSettings();
  return <GitHubCITab settings={settings} />;
}
