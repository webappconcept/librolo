// lib/db/admin-queries.ts
import { db } from "@/lib/db/drizzle";
import { activityLogs, roles, users } from "@/lib/db/schema";
import { and, count, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";
import "server-only";

export async function getDashboardStats() {
  const [
    totalUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    premiumUsers,
    verifiedUsers,
  ] = await Promise.all([
    db.select({ count: count() }).from(users).where(and(isNull(users.deletedAt), sql`${users.isAdmin} = false`)),
    db.select({ count: count() }).from(users).where(
      and(isNull(users.deletedAt), sql`${users.isAdmin} = false`, sql`${users.createdAt} >= NOW() - INTERVAL '30 days'`),
    ),
    db.select({ count: count() }).from(users).where(
      and(
        isNull(users.deletedAt),
        sql`${users.isAdmin} = false`,
        sql`${users.createdAt} >= NOW() - INTERVAL '60 days'`,
        sql`${users.createdAt} < NOW() - INTERVAL '30 days'`,
      ),
    ),
    db.select({ count: count() }).from(users).where(
      and(isNull(users.deletedAt), sql`${users.isAdmin} = false`, isNotNull(users.stripeSubscriptionId), sql`${users.subscriptionStatus} = 'active'`),
    ),
    db.select({ count: count() }).from(users).where(
      and(isNull(users.deletedAt), sql`${users.isAdmin} = false`, sql`${users.emailVerified} = true`),
    ),
  ]);

  const total = totalUsers[0].count;
  const newThis = newUsersThisMonth[0].count;
  const newLast = newUsersLastMonth[0].count;
  const premium = premiumUsers[0].count;
  const verified = verifiedUsers[0].count;
  const free = total - premium;
  const trendPercent = newLast > 0 ? Math.round(((newThis - newLast) / newLast) * 100) : newThis > 0 ? 100 : 0;

  return { totalUsers: total, newUsersThisMonth: newThis, trendPercent, premiumUsers: premium, freeUsers: free, verifiedUsers: verified, conversionRate: total > 0 ? Math.round((premium / total) * 100) : 0 };
}

export async function getUserGrowthChart() {
  noStore();
  const rows = await db.execute(sql`
    SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month, COUNT(*) AS total
    FROM users
    WHERE deleted_at IS NULL AND is_admin = false
      AND created_at >= NOW() - INTERVAL '7 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at) ASC
  `);
  return (rows as any[]).map((r) => ({ month: r.month as string, utenti: Number(r.total) }));
}

export type AdminUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  roleLabel: string | null;
  roleColor: string | null;
  isAdmin: boolean;
  isStaff: boolean;
  planName: string | null;
  subscriptionStatus: string | null;
  emailVerified: boolean;
  createdAt: Date;
  bannedAt: Date | null;
  deletedAt: Date | null;
  bannedReason: string | null;
};

export async function getAdminUsers({
  search = "",
  role = "",
  plan = "",
  verified = "",
  page = 1,
  perPage = 20,
  filter,
}: {
  search?: string;
  role?: string;
  plan?: string;
  verified?: string;
  page?: number;
  perPage?: number;
  filter?: "all" | "active" | "banned" | "premium" | "free";
} = {}) {
  noStore();

  const offset = (page - 1) * perPage;

  const normalizedFilter =
    filter && filter !== "all"
      ? filter
      : plan === "premium"
        ? "premium"
        : plan === "free"
          ? "free"
          : undefined;

  const baseWhere = and(
    isNull(users.deletedAt),
    sql`${users.isAdmin} = false`,
    search
      ? sql`(
          ${users.email} ILIKE ${"%" + search + "%"} OR
          ${users.firstName} ILIKE ${"%" + search + "%"} OR
          ${users.lastName} ILIKE ${"%" + search + "%"}
        )`
      : undefined,
    role ? eq(users.role, role) : undefined,
    verified === "true"
      ? sql`${users.emailVerified} = true`
      : verified === "false"
        ? sql`${users.emailVerified} = false`
        : undefined,
    normalizedFilter === "banned"
      ? isNotNull(users.bannedAt)
      : normalizedFilter === "premium"
        ? and(isNotNull(users.stripeSubscriptionId), sql`${users.subscriptionStatus} = 'active'`)
        : normalizedFilter === "free"
          ? sql`(${users.stripeSubscriptionId} IS NULL OR ${users.subscriptionStatus} != 'active')`
          : normalizedFilter === "active"
            ? isNull(users.bannedAt)
            : undefined,
  );

  const [rows, totalCount] = await Promise.all([
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        roleLabel: roles.label,
        roleColor: roles.color,
        isAdmin: users.isAdmin,
        isStaff: users.isStaff,
        planName: users.planName,
        subscriptionStatus: users.subscriptionStatus,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        bannedAt: users.bannedAt,
        deletedAt: users.deletedAt,
        bannedReason: users.bannedReason,
      })
      .from(users)
      .leftJoin(roles, eq(users.role, roles.name))
      .where(baseWhere)
      .orderBy(desc(users.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ count: count() }).from(users).leftJoin(roles, eq(users.role, roles.name)).where(baseWhere),
  ]);

  return {
    users: rows as AdminUser[],
    total: totalCount[0].count,
    page,
    perPage,
    totalPages: Math.ceil(totalCount[0].count / perPage),
  };
}

export async function getAdminUserById(id: number) {
  const [user] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      isAdmin: users.isAdmin,
      isStaff: users.isStaff,
      planName: users.planName,
      subscriptionStatus: users.subscriptionStatus,
      stripeCustomerId: users.stripeCustomerId,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      bannedAt: users.bannedAt,
      deletedAt: users.deletedAt,
      bannedReason: users.bannedReason,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user ?? null;
}

/**
 * Tipo del singolo utente restituito da getAdminUserById.
 * Usato dai componenti client della pagina /admin/users/[id].
 */
export type AdminUserDetail = NonNullable<Awaited<ReturnType<typeof getAdminUserById>>>;

export type AdminUserActivity = {
  id: number;
  action: string;
  ipAddress: string | null;
  timestamp: Date;
};

export async function getAdminUserActivity(userId: number): Promise<AdminUserActivity[]> {
  const result = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      ipAddress: activityLogs.ipAddress,
      timestamp: activityLogs.timestamp,
    })
    .from(activityLogs)
    .where(eq(activityLogs.userId, userId))
    .orderBy(desc(activityLogs.timestamp))
    .limit(30);

  return result;
}

/**
 * Recupera gli activity log globali con email dell'utente.
 * Usato dalla pagina /admin/logs.
 */
export async function getActivityLogs({ limit = 200 }: { limit?: number } = {}) {
  noStore();
  const result = await db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      userEmail: users.email,
      action: activityLogs.action,
      ipAddress: activityLogs.ipAddress,
      timestamp: activityLogs.timestamp,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit);

  return result;
}
