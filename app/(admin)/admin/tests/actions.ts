"use server";
// app/(admin)/admin/tests/actions.ts
//
// Infrastructure health checks (read-only) + Vitest report reader.
// Called by the Server Component page.tsx — no client state required.
import { requireAdminPage } from "@/lib/rbac/guards";
import { db } from "@/lib/db/drizzle";
import { getAppSettings } from "@/lib/db/settings-queries";
import { sql } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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
  google: ServiceHealth;
  checkedAt: string;
};

export type VitestTestResult = {
  name: string;
  status: "passed" | "failed" | "skipped" | "pending";
  duration?: number;
  failureMessages?: string[];
};

export type VitestSuite = {
  name: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  tests: VitestTestResult[];
};

export type VitestReport = {
  suites: VitestSuite[];
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTotalTests: number;
  startTime: number;
  success: boolean;
};

// ---------------------------------------------------------------------------
// Health checks
// ---------------------------------------------------------------------------
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
      return { name: "Upstash Redis", status: "unknown", latencyMs: null, detail: "Credentials not configured" };
    }
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { name: "Upstash Redis", status: "error", latencyMs, detail: `HTTP ${res.status}` };
    const body = await res.json() as { result?: string };
    const pong = body?.result === "PONG";
    return {
      name: "Upstash Redis",
      status: pong ? "ok" : "degraded",
      latencyMs,
      detail: pong ? undefined : `Unexpected response: ${JSON.stringify(body)}`,
    };
  } catch (e) {
    return { name: "Upstash Redis", status: "error", latencyMs: Date.now() - start, detail: String(e) };
  }
}

async function pingResend(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { name: "Resend", status: "unknown", latencyMs: null, detail: "RESEND_API_KEY not set" };
    }
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(4000),
    });
    const latencyMs = Date.now() - start;
    if (res.status === 200) return { name: "Resend", status: "ok", latencyMs };
    if (res.status === 401) return { name: "Resend", status: "error", latencyMs, detail: "Invalid API key" };
    return { name: "Resend", status: "degraded", latencyMs, detail: `HTTP ${res.status}` };
  } catch (e) {
    return { name: "Resend", status: "error", latencyMs: Date.now() - start, detail: String(e) };
  }
}

async function pingGoogle(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const settings = await getAppSettings();
    const clientId = settings.google_client_id;
    const clientSecret = settings.google_client_secret;
    if (!clientId || !clientSecret) {
      return { name: "Google OAuth", status: "unknown", latencyMs: null, detail: "Credentials not configured in settings" };
    }
    // 400 = invalid token (expected — means endpoint is live and reachable)
    const res = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=probe", {
      signal: AbortSignal.timeout(4000),
    });
    const latencyMs = Date.now() - start;
    if (res.status === 400) {
      return { name: "Google OAuth", status: "ok", latencyMs, detail: "Endpoint reachable · credentials present" };
    }
    return { name: "Google OAuth", status: "degraded", latencyMs, detail: `Unexpected HTTP ${res.status}` };
  } catch (e) {
    return { name: "Google OAuth", status: "error", latencyMs: Date.now() - start, detail: String(e) };
  }
}

export async function getHealthChecks(): Promise<HealthChecks> {
  await requireAdminPage();
  const [supabase, redis, resend, google] = await Promise.all([
    pingSupabase(),
    pingRedis(),
    pingResend(),
    pingGoogle(),
  ]);
  return { supabase, redis, resend, google, checkedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Vitest report reader
// ---------------------------------------------------------------------------
const REPORT_PATH = path.join(process.cwd(), "test-reports", "vitest-results.json");

export async function getVitestReport(): Promise<VitestReport | null> {
  await requireAdminPage();
  try {
    const raw = await fs.readFile(REPORT_PATH, "utf-8");
    const json = JSON.parse(raw);

    const suites: VitestSuite[] = (json.testResults ?? []).map((file: {
      testFilePath: string;
      status: string;
      perfStats?: { start: number; end: number };
      testResults: Array<{
        fullName?: string;
        title?: string;
        status: string;
        duration?: number;
        failureMessages?: string[];
      }>;
    }) => ({
      name: file.testFilePath
        ? file.testFilePath.replace(process.cwd() + "/", "")
        : "unknown",
      status: file.status as VitestSuite["status"],
      duration: file.perfStats ? file.perfStats.end - file.perfStats.start : 0,
      tests: (file.testResults ?? []).map((t) => ({
        name: t.fullName ?? t.title ?? "(unnamed)",
        status: t.status as VitestTestResult["status"],
        duration: t.duration,
        failureMessages: t.failureMessages,
      })),
    }));

    return {
      suites,
      numPassedTests: json.numPassedTests ?? 0,
      numFailedTests: json.numFailedTests ?? 0,
      numPendingTests: json.numPendingTests ?? 0,
      numTotalTests: json.numTotalTests ?? 0,
      startTime: json.startTime ?? 0,
      success: json.success ?? false,
    };
  } catch {
    return null;
  }
}
