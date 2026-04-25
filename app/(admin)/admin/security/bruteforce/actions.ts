"use server";

import { getAdminPath } from "@/lib/admin-nav";
import {
  blacklistIp,
  getBlacklist,
  getTopOffenders,
  removeFromBlacklist,
  unblockIp,
} from "@/lib/auth/rate-limit";
import { syncIpBlacklistToRedis } from "@/lib/auth/rate-limit-redis";
import { getAppSettings, updateAppSetting } from "@/lib/db/settings-queries";
import { requireAdminPage } from "@/lib/rbac/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ipSchema = z
  .string()
  .regex(
    /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/,
    "IP non valido",
  );

export async function getBruteforceData() {
  await requireAdminPage();
  const [offenders, blacklist, settings] = await Promise.all([
    getTopOffenders(100),
    getBlacklist(),
    getAppSettings(),
  ]);
  return {
    offenders,
    blacklist,
    config: {
      maxAttempts:    parseInt(settings.bf_max_attempts,    10),
      windowMinutes:  parseInt(settings.bf_window_minutes,  10),
      lockoutMinutes: parseInt(settings.bf_lockout_minutes, 10),
      alertThreshold: parseInt(settings.bf_alert_threshold, 10),
    },
  };
}

export async function actionUnblockIp(formData: FormData) {
  await requireAdminPage();
  const ip = ipSchema.parse(formData.get("ip"));
  // unblockIp ora sblocca anche Redis (dual-layer)
  await unblockIp(ip);
  revalidatePath(getAdminPath("security-bruteforce"));
  return { ok: true };
}

export async function actionBlacklistIp(formData: FormData) {
  await requireAdminPage();
  const ip     = ipSchema.parse(formData.get("ip"));
  const reason = (formData.get("reason") as string | null) ?? undefined;
  // Persiste su DB e sincronizza Redis
  await blacklistIp(ip, reason);
  await syncIpBlacklistToRedis(ip, true);
  revalidatePath(getAdminPath("security-bruteforce"));
  return { ok: true };
}

export async function actionRemoveFromBlacklist(formData: FormData) {
  await requireAdminPage();
  const ip = ipSchema.parse(formData.get("ip"));
  // Rimuove da DB e rimuove da Redis
  await removeFromBlacklist(ip);
  await syncIpBlacklistToRedis(ip, false);
  revalidatePath(getAdminPath("security-bruteforce"));
  return { ok: true };
}

const ConfigSchema = z.object({
  bf_max_attempts:    z.coerce.number().int().min(1).max(100),
  bf_window_minutes:  z.coerce.number().int().min(1).max(1440),
  bf_lockout_minutes: z.coerce.number().int().min(1).max(10080),
  bf_alert_threshold: z.coerce.number().int().min(1).max(1000),
});

export async function actionUpdateBruteforceConfig(formData: FormData) {
  await requireAdminPage();
  const parsed = ConfigSchema.safeParse({
    bf_max_attempts:    formData.get("bf_max_attempts"),
    bf_window_minutes:  formData.get("bf_window_minutes"),
    bf_lockout_minutes: formData.get("bf_lockout_minutes"),
    bf_alert_threshold: formData.get("bf_alert_threshold"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Valori non validi" };
  }
  await Promise.all([
    updateAppSetting("bf_max_attempts",    String(parsed.data.bf_max_attempts)),
    updateAppSetting("bf_window_minutes",  String(parsed.data.bf_window_minutes)),
    updateAppSetting("bf_lockout_minutes", String(parsed.data.bf_lockout_minutes)),
    updateAppSetting("bf_alert_threshold", String(parsed.data.bf_alert_threshold)),
  ]);
  revalidatePath(getAdminPath("security-bruteforce"));
  return { ok: true };
}
