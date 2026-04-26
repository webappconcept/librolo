// tests/app/signup-action-e2e.test.ts
//
// Flusso integrato signUpAction — mock di tutti i layer esterni,
// verifica l’orchestrazione end-to-end della Server Action.

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock next/navigation ────────────────────────────────────────────────────
const mockRedirect = vi.fn((url: string): never => {
  throw { __nextRedirect: true, url };
});
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

// ─── Mock next/headers ───────────────────────────────────────────────────────
const mockCookiesSet = vi.fn();
const mockCookiesDelete = vi.fn();
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" })),
  cookies: vi.fn().mockResolvedValue({
    set: mockCookiesSet,
    delete: mockCookiesDelete,
    get: vi.fn(),
  }),
}));

// ─── Mock server-only ────────────────────────────────────────────────────────
vi.mock("server-only", () => ({}));

// ─── Mock getAppSettings ─────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  registrations_enabled: "true",
  maintenance_mode: "false",
  default_role: "member",
  bf_signup_max: "10",
  bf_window_minutes: "15",
  bf_lockout_minutes: "30",
  bf_alert_threshold: "20",
  bf_check_max: "30",
  bf_check_window: "5",
  bf_signin_max: "5",
  upstash_redis_rest_url: "https://fake.upstash.io",
  upstash_redis_rest_token: "fake-token",
};

const mockGetAppSettings = vi.fn().mockResolvedValue(DEFAULT_SETTINGS);
vi.mock("@/lib/db/settings-queries", () => ({
  getAppSettings: mockGetAppSettings,
}));

// ─── Mock rate-limit ─────────────────────────────────────────────────────────
const mockCheckSignupRateLimit = vi.fn().mockResolvedValue({ blocked: false, remaining: 9 });
const mockRecordSignupAttempt  = vi.fn().mockResolvedValue(undefined);
const mockCheckRateLimit       = vi.fn().mockResolvedValue({ blocked: false, remaining: 4, lockoutMinutes: 30 });
const mockRecordLoginAttempt   = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth/rate-limit", () => ({
  checkSignupRateLimit:       mockCheckSignupRateLimit,
  recordSignupAttempt:        mockRecordSignupAttempt,
  checkRateLimit:             mockCheckRateLimit,
  recordLoginAttempt:         mockRecordLoginAttempt,
  checkAvailabilityRateLimit: vi.fn().mockResolvedValue({ blocked: false, remaining: 29 }),
}));

// ─── Mock blacklist ───────────────────────────────────────────────────────────
const mockIsIpBlacklisted       = vi.fn().mockResolvedValue(false);
const mockIsDomainBlacklisted   = vi.fn().mockResolvedValue(false);
const mockIsUsernameBlacklisted = vi.fn().mockResolvedValue(false);
vi.mock("@/lib/auth/blacklist", () => ({
  isIpBlacklisted:       mockIsIpBlacklisted,
  isDomainBlacklisted:   mockIsDomainBlacklisted,
  isUsernameBlacklisted: mockIsUsernameBlacklisted,
}));

// ─── Mock bloom-filter ───────────────────────────────────────────────────────
const mockCheckEmailAvailability    = vi.fn().mockResolvedValue({ available: true, checkedViaDb: false });
const mockCheckUsernameAvailability = vi.fn().mockResolvedValue({ available: true, checkedViaDb: false });
const mockAddEmailToBloom           = vi.fn().mockResolvedValue(undefined);
const mockAddUsernameToBloom        = vi.fn().mockResolvedValue(undefined);
const mockEnsureBloomFilter         = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/bloom/bloom-filter", () => ({
  checkEmailAvailability:    mockCheckEmailAvailability,
  checkUsernameAvailability: mockCheckUsernameAvailability,
  addEmailToBloom:           mockAddEmailToBloom,
  addUsernameToBloom:        mockAddUsernameToBloom,
  ensureBloomFilter:         mockEnsureBloomFilter,
  invalidateRedisConfigCache: vi.fn(),
}));

// ─── Mock DB (Drizzle) ────────────────────────────────────────────────────────
//
// DESIGN: db.insert() is called 3 times during signUp:
//   call 1 → users          → .values().returning()
//   call 2 → userProfiles   → .values()
//   call 3 → activityLogs   → .values()
//
// We expose three separate vi.fn() references so each test can override
// only what it needs via mockResolvedValueOnce / mockRejectedValueOnce.
// The factory inside vi.mock() reads them by closure at call time, so
// vi.clearAllMocks() resets call history without destroying the factory.

const MOCK_USER = {
  id: "user-abc-123",
  email: "mario@example.com",
  passwordHash: "$2b$12$hashedXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  role: "member",
  bannedAt: null,
};

// users insert: .values() returns { returning: fn }
const mockUsersReturning = vi.fn().mockResolvedValue([MOCK_USER]);
const mockUsersValues    = vi.fn().mockReturnValue({ returning: mockUsersReturning });

// userProfiles insert: .values() resolves directly
const mockProfilesValues = vi.fn().mockResolvedValue([]);

// activityLogs insert: .values() resolves directly
const mockActivityValues = vi.fn().mockResolvedValue([]);

// delete: .where() resolves
const mockDbDeleteWhere = vi.fn().mockResolvedValue([]);

let insertCallCount = 0;

vi.mock("@/lib/db/drizzle", () => ({
  db: {
    // Factory reads the external vi.fn() refs by closure — survives clearAllMocks()
    insert: vi.fn(() => {
      insertCallCount += 1;
      if (insertCallCount === 1) return { values: mockUsersValues };
      if (insertCallCount === 2) return { values: mockProfilesValues };
      return { values: mockActivityValues };
    }),
    select: vi.fn(() => ({
      from: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue([MOCK_USER]) }) }),
    })),
    delete: vi.fn(() => ({ where: mockDbDeleteWhere })),
    update: vi.fn(() => ({ set: () => ({ where: vi.fn() }) })),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  users:        { id: "id", email: "email", passwordHash: "passwordHash" },
  userProfiles: { id: "id", username: "username", userId: "userId" },
  activityLogs: { userId: "userId", action: "action", ipAddress: "ipAddress" },
  ActivityType: {
    SIGN_UP: "SIGN_UP", SIGN_IN: "SIGN_IN", SIGN_OUT: "SIGN_OUT",
    DELETE_ACCOUNT: "DELETE_ACCOUNT", UPDATE_PASSWORD: "UPDATE_PASSWORD",
    UPDATE_ACCOUNT: "UPDATE_ACCOUNT",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq:  vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  sql: Object.assign(
    vi.fn((s: TemplateStringsArray) => s[0]),
    { raw: vi.fn((s: string) => s) },
  ),
}));

// ─── Mock session / password ──────────────────────────────────────────────────
const mockHashPassword    = vi.fn().mockResolvedValue("$2b$12$hashedXXX");
const mockComparePasswords = vi.fn().mockResolvedValue(true);
const mockSetSession       = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth/session", () => ({
  hashPassword:    mockHashPassword,
  comparePasswords: mockComparePasswords,
  setSession:      mockSetSession,
  getSession:      vi.fn(),
}));

// ─── Mock OTP ─────────────────────────────────────────────────────────────────
const mockCreateVerificationCode = vi.fn().mockResolvedValue("123456");
vi.mock("@/lib/auth/otp", () => ({
  createVerificationCode: mockCreateVerificationCode,
}));

// ─── Mock email ───────────────────────────────────────────────────────────────
const mockSendSignupVerificationEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email/templates/signup-verification", () => ({
  sendSignupVerificationEmail: mockSendSignupVerificationEmail,
}));

// ─── Mock race-condition helpers ──────────────────────────────────────────────
const mockIsUniqueConstraintError = vi.fn().mockReturnValue(false);
vi.mock("@/lib/auth/race-condition", () => ({
  isUniqueConstraintError: mockIsUniqueConstraintError,
  resolveConflictField:    vi.fn().mockReturnValue("email"),
}));

// ─── Mock consent versions ────────────────────────────────────────────────────
vi.mock("@/lib/db/pages-queries", () => ({
  getConsentVersions: vi.fn().mockResolvedValue({
    termsVersion: "1.0", privacyVersion: "1.0", marketingVersion: "1.0",
  }),
}));

// ─── Mock middleware ─────────────────────────────────────────────────────────────
// validatedAction wraps fn transparently: runs Zod parse, then calls fn
vi.mock("@/lib/auth/middleware", () => ({
  validatedAction: vi.fn(
    (
      schema: { safeParseAsync: (d: unknown) => Promise<{
        success: boolean;
        data?: unknown;
        error?: { flatten: () => { fieldErrors: Record<string, string[]> } };
      }> },
      fn: (data: unknown, fd: FormData) => Promise<unknown>,
    ) =>
      async (_prevState: unknown, formData: FormData) => {
        const result = await schema.safeParseAsync(Object.fromEntries(formData.entries()));
        if (!result.success) {
          const fieldErrors = result.error!.flatten().fieldErrors;
          const firstMsg = Object.values(fieldErrors).flat()[0] ?? "Dati non validi";
          return { error: firstMsg };
        }
        return fn(result.data, formData);
      },
  ),
  validatedActionWithUser: vi.fn((_schema: unknown, fn: unknown) => fn),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const defaults: Record<string, string> = {
    firstName:       "Mario",
    lastName:        "Rossi",
    username:        "mario_rossi",
    email:           "mario@example.com",
    password:        "Password1",
    confirmPassword: "Password1",
    acceptTerms:     "on",
    acceptPrivacy:   "on",
  };
  for (const [k, v] of Object.entries({ ...defaults, ...overrides })) {
    fd.set(k, v);
  }
  return fd;
}

async function callSignUp(overrides: Record<string, string> = {}) {
  const { signUp } = await import("@/app/(login)/actions");
  try {
    return await signUp({} as never, makeFormData(overrides));
  } catch (e: unknown) {
    const err = e as { __nextRedirect?: boolean; url?: string };
    if (err.__nextRedirect) return { redirected: true, url: err.url };
    throw e;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("signUpAction — flusso end-to-end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCallCount = 0;

    // Restore defaults after clearAllMocks()
    mockGetAppSettings.mockResolvedValue(DEFAULT_SETTINGS);
    mockCheckSignupRateLimit.mockResolvedValue({ blocked: false, remaining: 9 });
    mockIsIpBlacklisted.mockResolvedValue(false);
    mockIsDomainBlacklisted.mockResolvedValue(false);
    mockIsUsernameBlacklisted.mockResolvedValue(false);
    mockCheckEmailAvailability.mockResolvedValue({ available: true, checkedViaDb: false });
    mockCheckUsernameAvailability.mockResolvedValue({ available: true, checkedViaDb: false });
    mockIsUniqueConstraintError.mockReturnValue(false);
    mockCreateVerificationCode.mockResolvedValue("123456");
    mockSendSignupVerificationEmail.mockResolvedValue(undefined);
    mockDbDeleteWhere.mockResolvedValue([]);

    // DB insert mocks — restore default implementations
    mockUsersReturning.mockResolvedValue([MOCK_USER]);
    mockUsersValues.mockReturnValue({ returning: mockUsersReturning });
    mockProfilesValues.mockResolvedValue([]);
    mockActivityValues.mockResolvedValue([]);
  });

  // ─── Happy path ────────────────────────────────────────────────────────────
  describe("Happy path", () => {
    it("completa la registrazione e fa redirect a /verify-email", async () => {
      const result = await callSignUp();
      expect(result).toMatchObject({ redirected: true, url: "/verify-email" });
    });

    it("chiama hashPassword con la password fornita", async () => {
      await callSignUp();
      expect(mockHashPassword).toHaveBeenCalledWith("Password1");
    });

    it("aggiunge email al Bloom filter dopo l'insert", async () => {
      await callSignUp();
      expect(mockAddEmailToBloom).toHaveBeenCalledWith("mario@example.com");
    });

    it("aggiunge username al Bloom filter dopo l'insert", async () => {
      await callSignUp();
      expect(mockAddUsernameToBloom).toHaveBeenCalledWith("mario_rossi");
    });

    it("invia email di verifica con email, OTP e firstName", async () => {
      await callSignUp();
      expect(mockSendSignupVerificationEmail).toHaveBeenCalledWith(
        "mario@example.com",
        "123456",
        "Mario",
      );
    });

    it("imposta cookie pending_verification_user_id con httpOnly", async () => {
      await callSignUp();
      expect(mockCookiesSet).toHaveBeenCalledWith(
        "pending_verification_user_id",
        MOCK_USER.id,
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it("accetta registrazione con acceptMarketing=on", async () => {
      const result = await callSignUp({ acceptMarketing: "on" });
      expect(result).toMatchObject({ redirected: true, url: "/verify-email" });
    });
  });

  // ─── Registrations disabled ───────────────────────────────────────────────
  describe("Registrazioni disabilitate", () => {
    it("restituisce errore se registrations_enabled=false", async () => {
      mockGetAppSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, registrations_enabled: "false" });

      const result = await callSignUp();

      expect(result).toMatchObject({ error: expect.stringContaining("chiuse") });
      expect(mockUsersReturning).not.toHaveBeenCalled();
    });
  });

  // ─── Rate limiting ────────────────────────────────────────────────────────
  describe("Rate limiting", () => {
    it("blocca se checkSignupRateLimit è blocked", async () => {
      mockCheckSignupRateLimit.mockResolvedValue({ blocked: true, remaining: 0 });

      const result = await callSignUp();

      expect(result).toMatchObject({ error: expect.stringContaining("Troppi tentativi") });
      expect(mockUsersReturning).not.toHaveBeenCalled();
    });
  });

  // ─── Blacklists ───────────────────────────────────────────────────────────
  describe("Blacklists", () => {
    it("blocca IP nella blacklist", async () => {
      mockIsIpBlacklisted.mockResolvedValue(true);
      const result = await callSignUp();
      expect(result).toMatchObject({ error: expect.stringContaining("Accesso non consentito") });
      expect(mockUsersReturning).not.toHaveBeenCalled();
    });

    it("blocca dominio email nella blacklist", async () => {
      mockIsDomainBlacklisted.mockResolvedValue(true);
      const result = await callSignUp();
      expect(result).toMatchObject({ error: expect.stringContaining("provider email") });
      expect(mockUsersReturning).not.toHaveBeenCalled();
    });

    it("blocca username nella blacklist", async () => {
      mockIsUsernameBlacklisted.mockResolvedValue(true);
      const result = await callSignUp();
      expect(result).toMatchObject({ error: expect.stringContaining("username non è disponibile") });
      expect(mockUsersReturning).not.toHaveBeenCalled();
    });
  });

  // ─── Bloom filter guards ──────────────────────────────────────────────────
  describe("Bloom filter guards", () => {
    it("restituisce errore se email già registrata", async () => {
      mockCheckEmailAvailability.mockResolvedValue({ available: false, checkedViaDb: true });
      const result = await callSignUp();
      expect(result).toMatchObject({ error: expect.stringContaining("email è già stata registrata") });
      expect(mockUsersReturning).not.toHaveBeenCalled();
    });

    it("restituisce errore se username già in uso", async () => {
      mockCheckUsernameAvailability.mockResolvedValue({ available: false, checkedViaDb: true });
      const result = await callSignUp();
      expect(result).toMatchObject({ error: expect.stringContaining("username è già in uso") });
      expect(mockUsersReturning).not.toHaveBeenCalled();
    });
  });

  // ─── Race conditions ──────────────────────────────────────────────────────
  describe("Race conditions", () => {
    it("gestisce race condition su email (unique constraint users) → recordSignupAttempt", async () => {
      // users .values().returning() rejects + isUniqueConstraintError returns true
      mockUsersReturning.mockRejectedValueOnce(new Error("unique violation"));
      mockIsUniqueConstraintError.mockReturnValueOnce(true);

      const result = await callSignUp();

      expect(result).toMatchObject({ error: expect.stringContaining("appena stata registrata") });
      expect(mockRecordSignupAttempt).toHaveBeenCalledWith("1.2.3.4");
    });

    it("gestisce race condition su username (unique constraint userProfiles) → elimina user orfano + recordSignupAttempt", async () => {
      // users insert succeeds normally (no mock override needed).
      // userProfiles .values() rejects + isUniqueConstraintError returns true
      // NOTE: isUniqueConstraintError is only called inside catch blocks.
      //   - users catch: NOT reached (users succeeds) → no call, no value consumed
      //   - userProfiles catch: reached → first mockReturnValueOnce(true) consumed here
      mockProfilesValues.mockRejectedValueOnce(new Error("unique violation"));
      mockIsUniqueConstraintError.mockReturnValueOnce(true);

      const result = await callSignUp();

      expect(result).toMatchObject({ error: expect.stringContaining("username è appena stato scelto") });
      expect(mockDbDeleteWhere).toHaveBeenCalled();
      expect(mockRecordSignupAttempt).toHaveBeenCalledWith("1.2.3.4");
    });
  });

  // ─── Email verification fallback ──────────────────────────────────────────
  describe("Email verification fallback", () => {
    it("non interrompe il flusso se sendSignupVerificationEmail fallisce", async () => {
      mockSendSignupVerificationEmail.mockRejectedValueOnce(new Error("Resend error"));

      const result = await callSignUp();

      expect(result).toMatchObject({ redirected: true, url: "/verify-email" });
      expect(mockAddEmailToBloom).toHaveBeenCalled();
      expect(mockCookiesSet).toHaveBeenCalled();
    });
  });

  // ─── Validazione Zod ─────────────────────────────────────────────────────────────
  describe("Validazione schema", () => {
    it("rifiuta firstName vuoto prima di qualsiasi chiamata server", async () => {
      const result = await callSignUp({ firstName: "" });
      expect(result).toMatchObject({ error: expect.stringContaining("nome") });
      expect(mockGetAppSettings).not.toHaveBeenCalled();
    });

    it("rifiuta password mismatch", async () => {
      const result = await callSignUp({ confirmPassword: "AltroPass1" });
      expect(result).toMatchObject({ error: expect.stringContaining("password non sono uguali") });
      expect(mockGetAppSettings).not.toHaveBeenCalled();
    });

    it("rifiuta acceptTerms non spuntato", async () => {
      const result = await callSignUp({ acceptTerms: "off" });
      expect(result).toMatchObject({ error: expect.stringContaining("Termini") });
      expect(mockGetAppSettings).not.toHaveBeenCalled();
    });

    it("rifiuta email malformata", async () => {
      const result = await callSignUp({ email: "non-una-email" });
      expect(result).toMatchObject({ error: expect.anything() });
      expect(mockGetAppSettings).not.toHaveBeenCalled();
    });

    it("rifiuta username con caratteri non ammessi", async () => {
      const result = await callSignUp({ username: "mario rossi!" });
      expect(result).toMatchObject({ error: expect.anything() });
      expect(mockGetAppSettings).not.toHaveBeenCalled();
    });
  });
});
