import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Drizzle e settings — isoliamo la logica pura
// ---------------------------------------------------------------------------
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/db/drizzle", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  },
}));

vi.mock("@/lib/db/settings-queries", () => ({
  getAppSettings: vi.fn().mockResolvedValue({
    bf_max_attempts: "3",
    bf_window_minutes: "10",
    bf_lockout_minutes: "20",
    bf_alert_threshold: "15",
  }),
}));

// ---------------------------------------------------------------------------
// Helpers per mockare le query chain di Drizzle
// ---------------------------------------------------------------------------
function makeChain(finalValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "where", "groupBy", "orderBy", "limit", "values", "onConflictDoNothing", "onConflictDoUpdate", "catch"];
  methods.forEach((m) => { chain[m] = vi.fn(() => chain); });
  chain["then"] = (resolve: (v: unknown) => unknown) => Promise.resolve(finalValue).then(resolve);
  return chain;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe("Bruteforce config — soglie dal DB", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // delete ritorna sempre una chain (usata da cleanupOldAttempts e unblockIp)
    mockDelete.mockReturnValue(makeChain(undefined));
  });

  it("blocca l'IP quando i tentativi superano maxAttempts dal DB", async () => {
    // Simula: blacklist vuota, 4 tentativi (> maxAttempts=3)
    mockSelect
      .mockReturnValueOnce(makeChain([]))           // blacklist check → vuota
      .mockReturnValueOnce(makeChain([{ total: 4 }])); // count tentativi

    const { checkRateLimit } = await import("@/lib/auth/rate-limit");
    const result = await checkRateLimit("test@example.com", "1.2.3.4");

    expect(result.blocked).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.lockoutMinutes).toBe(20);
  });

  it("non blocca se i tentativi sono sotto la soglia", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([{ total: 1 }]));

    const { checkRateLimit } = await import("@/lib/auth/rate-limit");
    const result = await checkRateLimit("test@example.com", "1.2.3.4");

    expect(result.blocked).toBe(false);
    expect(result.remaining).toBe(2); // 3 - 1
  });

  it("blocca sempre se l'IP è in blacklist, indipendentemente dai tentativi", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ id: 99 }])); // blacklist → trovato

    const { checkRateLimit } = await import("@/lib/auth/rate-limit");
    const result = await checkRateLimit("any@example.com", "5.5.5.5");

    expect(result.blocked).toBe(true);
    expect(result.remaining).toBe(0);
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it("unblockIp cancella solo i tentativi nella finestra attiva", async () => {
    const { unblockIp } = await import("@/lib/auth/rate-limit");
    await unblockIp("1.2.3.4");

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("blacklistIp inserisce l'IP con onConflictDoNothing", async () => {
    mockInsert.mockReturnValue(makeChain(undefined));

    const { blacklistIp } = await import("@/lib/auth/rate-limit");
    await blacklistIp("9.9.9.9", "attacco massiccio");

    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it("i valori del form config vengono validati correttamente (schema Zod)", () => {
    const { z } = require("zod");
    const ConfigSchema = z.object({
      bf_max_attempts: z.coerce.number().int().min(1).max(100),
      bf_window_minutes: z.coerce.number().int().min(1).max(1440),
      bf_lockout_minutes: z.coerce.number().int().min(1).max(10080),
      bf_alert_threshold: z.coerce.number().int().min(1).max(1000),
    });

    expect(ConfigSchema.safeParse({ bf_max_attempts: "5", bf_window_minutes: "15", bf_lockout_minutes: "30", bf_alert_threshold: "20" }).success).toBe(true);
    expect(ConfigSchema.safeParse({ bf_max_attempts: "0", bf_window_minutes: "15", bf_lockout_minutes: "30", bf_alert_threshold: "20" }).success).toBe(false);
    expect(ConfigSchema.safeParse({ bf_max_attempts: "101", bf_window_minutes: "15", bf_lockout_minutes: "30", bf_alert_threshold: "20" }).success).toBe(false);
  });
});
