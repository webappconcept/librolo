// lib/auth/rate-limit-redis.ts
//
// Layer Redis (Upstash REST) per il rate limiting.
// Pattern: INCR + EXPIRE (fixed window) — O(1), sub-millisecond su Upstash.
//
// Chiavi:
//   rl:login:{ip}:{email}   → tentativi login per coppia IP+email
//   rl:email:{email}        → tentativi login per sola email (anti IP-rotation)
//   rl:signup:{ip}          → tentativi signup per IP
//   rl:blacklist:{ip}       → flag blacklist IP ("1", no TTL = permanente)
//
// Il layer Redis è always-first: se Redis è down il chiamante fa fallback
// trasparente al DB esistente — nessuna interruzione del servizio.

import { getAppSettings } from "@/lib/db/settings-queries";

// ---------------------------------------------------------------------------
// Redis REST client (stesso pattern del bloom filter)
// ---------------------------------------------------------------------------

let _cachedConfig: { url: string; token: string } | null = null;
let _cacheExpiry = 0;

async function getRedisConfig(): Promise<{ url: string; token: string }> {
  const now = Date.now();
  // Cache la config per 60s per evitare un getAppSettings() ad ogni request
  if (_cachedConfig && now < _cacheExpiry) return _cachedConfig;

  const settings = await getAppSettings();
  const url = settings.upstash_redis_rest_url;
  const token = settings.upstash_redis_rest_token;

  if (!url || !token) {
    throw new Error("[rate-limit-redis] Missing Upstash credentials in app settings");
  }

  _cachedConfig = { url, token };
  _cacheExpiry = now + 60_000;
  return _cachedConfig;
}

async function redisCmd<T = unknown>(command: (string | number)[]): Promise<T> {
  const { url, token } = await getRedisConfig();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    // Timeout aggressivo: se Redis è lento preferiamo il fallback DB
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[rate-limit-redis] HTTP ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { result: T; error?: string };
  if (json.error) throw new Error(`[rate-limit-redis] ${json.error}`);
  return json.result;
}

async function redisPipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const { url, token } = await getRedisConfig();
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[rate-limit-redis] pipeline HTTP ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { result: unknown; error?: string }[];
  return json.map((r) => r.result);
}

// ---------------------------------------------------------------------------
// Key builders
// ---------------------------------------------------------------------------

const KEY_LOGIN    = (ip: string, email: string) => `rl:login:${ip}:${email}`;
const KEY_EMAIL    = (email: string)             => `rl:email:${email}`;
const KEY_SIGNUP   = (ip: string)                => `rl:signup:${ip}`;
const KEY_BLACKLIST = (ip: string)               => `rl:blacklist:${ip}`;

// ---------------------------------------------------------------------------
// Blacklist IP — Redis come L1 cache
// ---------------------------------------------------------------------------

/**
 * Verifica se un IP è in blacklist leggendo da Redis.
 * Ritorna null se Redis non è disponibile (il chiamante fa fallback al DB).
 */
export async function isIpBlacklistedRedis(ip: string): Promise<boolean | null> {
  try {
    const val = await redisCmd<string | null>(["GET", KEY_BLACKLIST(ip)]);
    return val !== null;
  } catch {
    return null; // fallback al DB
  }
}

/**
 * Sincronizza la blacklist DB → Redis.
 * Da chiamare in actionBlacklistIp e actionRemoveFromBlacklist (admin).
 */
export async function syncIpBlacklistToRedis(
  ip: string,
  blacklisted: boolean,
): Promise<void> {
  try {
    if (blacklisted) {
      await redisCmd(["SET", KEY_BLACKLIST(ip), "1"]);
    } else {
      await redisCmd(["DEL", KEY_BLACKLIST(ip)]);
    }
  } catch (err) {
    // Non bloccante: la blacklist DB è sempre il source of truth
    console.error("[rate-limit-redis] syncIpBlacklistToRedis failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Rate limit login (email + IP  +  email globale)
// ---------------------------------------------------------------------------

export type RedisRateLimitResult =
  | { blocked: true;  remaining: 0;   lockoutSeconds: number; source: "redis" }
  | { blocked: false; remaining: number; lockoutSeconds: number; source: "redis" }
  | { source: "unavailable" };

/**
 * Controlla e incrementa il rate limit per il login.
 *
 * Usa due contatori:
 *   1. rl:login:{ip}:{email}  — soglia maxAttempts     (blocco rapido per coppia)
 *   2. rl:email:{email}       — soglia maxAttempts * 3 (anti IP-rotation)
 *
 * Entrambi i contatori vengono incrementati in un'unica pipeline.
 * Il TTL viene impostato solo al primo incremento (INCR da 0 → 1).
 */
export async function checkAndIncrLoginRedis(
  email: string,
  ip: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<RedisRateLimitResult> {
  try {
    const keyPair  = KEY_LOGIN(ip, email);
    const keyEmail = KEY_EMAIL(email);
    const globalThreshold = maxAttempts * 3;
    const lockoutSeconds = windowSeconds;

    // Pipeline: INCR entrambe le chiavi in un colpo solo
    const [pairCount, emailCount] = (await redisPipeline([
      ["INCR", keyPair],
      ["INCR", keyEmail],
    ])) as [number, number];

    // Imposta TTL solo al primo incremento (chiave appena creata)
    const ttlCmds: (string | number)[][] = [];
    if (pairCount  === 1) ttlCmds.push(["EXPIRE", keyPair,  windowSeconds]);
    if (emailCount === 1) ttlCmds.push(["EXPIRE", keyEmail, windowSeconds]);
    if (ttlCmds.length > 0) await redisPipeline(ttlCmds);

    const blocked =
      pairCount  >= maxAttempts ||
      emailCount >= globalThreshold;

    const remaining = blocked
      ? 0
      : Math.min(
          maxAttempts    - pairCount,
          globalThreshold - emailCount,
        );

    return { blocked, remaining, lockoutSeconds, source: "redis" };
  } catch {
    return { source: "unavailable" };
  }
}

/**
 * Solo controllo (senza INCR) — usato prima di eseguire operazioni costose
 * (es. comparePasswords) per non incrementare il contatore su richieste
 * già bloccate.
 */
export async function peekLoginRedis(
  email: string,
  ip: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<RedisRateLimitResult> {
  try {
    const keyPair  = KEY_LOGIN(ip, email);
    const keyEmail = KEY_EMAIL(email);
    const globalThreshold = maxAttempts * 3;

    const [pairRaw, emailRaw] = (await redisPipeline([
      ["GET", keyPair],
      ["GET", keyEmail],
    ])) as [string | null, string | null];

    const pairCount  = pairRaw  ? parseInt(pairRaw,  10) : 0;
    const emailCount = emailRaw ? parseInt(emailRaw, 10) : 0;

    const blocked =
      pairCount  >= maxAttempts ||
      emailCount >= globalThreshold;

    const remaining = blocked
      ? 0
      : Math.min(
          maxAttempts    - pairCount,
          globalThreshold - emailCount,
        );

    return { blocked, remaining, lockoutSeconds: windowSeconds, source: "redis" };
  } catch {
    return { source: "unavailable" };
  }
}

/**
 * Sblocca un IP da Redis: elimina tutte le chiavi rl:login:{ip}:*
 * tramite SCAN + DEL (Upstash supporta SCAN in REST).
 * Chiamare insieme a unblockIp() DB.
 */
export async function unblockIpRedis(ip: string): Promise<void> {
  try {
    // SCAN per trovare tutte le chiavi rl:login:{ip}:*
    let cursor = "0";
    const keysToDelete: string[] = [];

    do {
      const result = (await redisCmd<[string, string[]]>([
        "SCAN", cursor, "MATCH", `rl:login:${ip}:*`, "COUNT", 100,
      ]));
      cursor = result[0];
      keysToDelete.push(...result[1]);
    } while (cursor !== "0");

    // Aggiungi anche la chiave blacklist per questo IP
    keysToDelete.push(KEY_BLACKLIST(ip));

    if (keysToDelete.length > 0) {
      await redisPipeline(keysToDelete.map((k) => ["DEL", k]));
    }
  } catch (err) {
    console.error("[rate-limit-redis] unblockIpRedis failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Rate limit signup per IP
// ---------------------------------------------------------------------------

/**
 * Controlla e incrementa il rate limit per il signup.
 * Chiave: rl:signup:{ip} — soglia maxAttempts * 2
 */
export async function checkAndIncrSignupRedis(
  ip: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<RedisRateLimitResult> {
  try {
    const key = KEY_SIGNUP(ip);
    const signupThreshold = maxAttempts * 2;

    const count = (await redisCmd<number>(["INCR", key])) as number;
    if (count === 1) {
      await redisCmd(["EXPIRE", key, windowSeconds]);
    }

    const blocked   = count >= signupThreshold;
    const remaining = Math.max(0, signupThreshold - count);

    return { blocked, remaining, lockoutSeconds: windowSeconds, source: "redis" };
  } catch {
    return { source: "unavailable" };
  }
}
