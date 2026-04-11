// lib/db/content-activity.ts
// Utility server-side per scrivere activity log relativi ai contenuti CMS.
// Non usa cookies/session per non accoppiare il logger alla sessione:
// il chiamante (Server Action) passa esplicitamente l'userId se disponibile.
import "server-only";
import { db } from "@/lib/db/drizzle";
import { activityLogs, ActivityType } from "@/lib/db/schema";
import { headers } from "next/headers";

/**
 * Scrive un singolo record in activity_logs.
 *
 * @param action  - uno dei valori ActivityType (es. ActivityType.PAGE_CREATED)
 * @param detail  - stringa libera separata con " | " (es. "slug: /about | titolo: About")
 * @param userId  - id utente admin che ha eseguito l'azione (opzionale)
 */
export async function logContentActivity(
  action: ActivityType,
  detail: string,
  userId?: number | null,
): Promise<void> {
  try {
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      hdrs.get("x-real-ip") ??
      null;

    await db.insert(activityLogs).values({
      action: detail ? `${action} | ${detail}` : action,
      userId: userId ?? null,
      ipAddress: ip,
      timestamp: new Date(),
    });
  } catch (err) {
    // Il log non deve mai far fallire l'operazione principale
    console.error("[logContentActivity] failed:", err);
  }
}
