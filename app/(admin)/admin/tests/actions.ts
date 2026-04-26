"use server";
// app/(admin)/admin/tests/actions.ts
//
// Health checks infrastrutturali — read-only, nessun side effect.
// Usati dal Server Component page.tsx per alimentare il dashboard.
import { requireAdminPage } from "@/lib/rbac/guards";
import { db } from "@/lib/db/drizzle";
import { getAppSettings } from "@/lib/db/settings-queries";
import { sql } from "drizzle-orm";

export type HealthStatus = "ok" | "degraded" | "error" | "unknown";

export type ServiceHealth = {
  name: string;
  status: HealthStatus;
  latencyMs: number | null;
  detail?: string;
};

export type HealthChecks = {
  supabase: ServiceHealth;
  redis: ServiceHealth;
  resend: ServiceHealth;
  checkedAt: string;
};

async function pingSupabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { name: "Supabase", status: "ok", latencyMs: Date.now() - start };
  } catch (e) {
    return { name: "Supabase", status: "error", latencyMs: Date.now() - start, detail: String(e) };
  }
}

async function pingRedis(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const settings = await getAppSettings();
    const url = settings.upstash_redis_rest_url;
    const token = settings.upstash_redis_rest_token;

    if (!url || !token) {
      return { name: "Upstash Redis", status: "unknown", latencyMs: null, detail: "Credenziali non configurate" };
    }

    const res = await fetch(`${url}/ping`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return { name: "Upstash Redis", status: "error", latencyMs, detail: `HTTP ${res.status}` };
    }

    const body = await res.json() as { result?: string };
    const pong = body?.result === "PONG";

    return {
      name: "Upstash Redis",
      status: pong ? "ok" : "degraded",
      latencyMs,
      detail: pong ? undefined : `Risposta inattesa: ${JSON.stringify(body)}`,
    };
  } catch (e) {
    return { name: "Upstash Redis", status: "error", latencyMs: Date.now() - start, detail: String(e) };
  }
}

async function pingResend(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Resend ha un endpoint /domains read-only che non consuma credito
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { name: "Resend", status: "unknown", latencyMs: null, detail: "RESEND_API_KEY non impostata" };
    }

    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(4000),
    });

    const latencyMs = Date.now() - start;

    if (res.status === 200) return { name: "Resend", status: "ok", latencyMs };
    if (res.status === 401) return { name: "Resend", status: "error", latencyMs, detail: "API key non valida" };

    return { name: "Resend", status: "degraded", latencyMs, detail: `HTTP ${res.status}` };
  } catch (e) {
    return { name: "Resend", status: "error", latencyMs: Date.now() - start, detail: String(e) };
  }
}

export async function getHealthChecks(): Promise<HealthChecks> {
  await requireAdminPage();

  const [supabase, redis, resend] = await Promise.all([
    pingSupabase(),
    pingRedis(),
    pingResend(),
  ]);

  return {
    supabase,
    redis,
    resend,
    checkedAt: new Date().toISOString(),
  };
}
