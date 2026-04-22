import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeNextContentVersion } from "@/lib/db/pages-queries";

// ---------------------------------------------------------------------------
// computeNextContentVersion — unit tests (no DB)
// ---------------------------------------------------------------------------
describe("computeNextContentVersion", () => {
  beforeEach(() => {
    // Fissa la data corrente: aprile 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T10:00:00Z"));
  });

  it("incrementa il numero progressivo nello stesso mese", () => {
    expect(computeNextContentVersion("1-2026-04")).toBe("2-2026-04");
    expect(computeNextContentVersion("2-2026-04")).toBe("3-2026-04");
    expect(computeNextContentVersion("9-2026-04")).toBe("10-2026-04");
  });

  it("resetta a 1 quando il mese cambia", () => {
    expect(computeNextContentVersion("3-2026-01")).toBe("1-2026-04");
    expect(computeNextContentVersion("1-2025-12")).toBe("1-2026-04");
  });

  it("resetta a 1 se il formato è sconosciuto", () => {
    expect(computeNextContentVersion("2026-04")).toBe("1-2026-04");
    expect(computeNextContentVersion("")).toBe("1-2026-04");
    expect(computeNextContentVersion("invalid")).toBe("1-2026-04");
  });

  it("gestisce correttamente il cambio anno", () => {
    vi.setSystemTime(new Date("2027-01-15T10:00:00Z"));
    expect(computeNextContentVersion("5-2026-12")).toBe("1-2027-01");
  });
});

// ---------------------------------------------------------------------------
// Guard: pagine di sistema non eliminabili
// ---------------------------------------------------------------------------
describe("deletePageCascade — system page guard", () => {
  it("lancia SYSTEM_PAGE_PROTECTED per pagine di sistema (mock DB)", async () => {
    // Mock del modulo drizzle: simula una pagina con isSystem=true
    vi.mock("@/lib/db/drizzle", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([{ id: 1, slug: "privacy-policy", isSystem: true, parentId: null }]),
            }),
          }),
        }),
      },
    }));

    const { deletePageCascade } = await import("@/lib/db/pages-queries");
    await expect(deletePageCascade("privacy-policy")).rejects.toThrow(
      "SYSTEM_PAGE_PROTECTED",
    );
  });
});
