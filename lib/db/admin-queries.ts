// lib/db/admin-queries.ts
import { db } from "@/lib/db/drizzle";
import { activityLogs, users } from "@/lib/db/schema";
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
    db.select({ count: count() }).from(users).where(isNull(users.deletedAt)),

    db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          sql`${users.createdAt} >= NOW() - INTERVAL '30 days'`,
        ),
      ),

    db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          sql`${users.createdAt} >= NOW() - INTERVAL '60 days'`,
          sql`${users.createdAt} < NOW() - INTERVAL '30 days'`,
        ),
      ),

    db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          isNotNull(users.stripeSubscriptionId),
          sql`${users.subscriptionStatus} = 'active'`,
        ),
      ),

    db
      .select({ count: count() })
      .from(users)
      .where(and(isNull(users.deletedAt), sql`${users.emailVerified} = true`)),
  ]);

  const total = totalUsers[0].count;
  const newThis = newUsersThisMonth[0].count;
  const newLast = newUsersLastMonth[0].count;
  const premium = premiumUsers[0].count;
  const verified = verifiedUsers[0].count;
  const free = total - premium;

  const trendPercent =
    newLast > 0
      ? Math.round(((newThis - newLast) / newLast) * 100)
      : newThis > 0
        ? 100
        : 0;

  return {
    totalUsers: total,
    newUsersThisMonth: newThis,
    trendPercent,
    premiumUsers: premium,
    freeUsers: free,
    verifiedUsers: verified,
    conversionRate: total > 0 ? Math.round((premium / total) * 100) : 0,
  };
}

export async function getUserGrowthChart() {
  noStore();
  // Ultimi 7 mesi
  const rows = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
      COUNT(*) AS total
    FROM users
    WHERE deleted_at IS NULL
      AND created_at >= NOW() - INTERVAL '7 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at) ASC
  `);

  return (rows as any[]).map((r) => ({
    month: r.month as string,
    utenti: Number(r.total),
  }));
}

export type AdminUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
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
  page = 1,
  perPage = 20,
}: {
  search?: string;
  role?: string;
  plan?: string;
  page?: number;
  perPage?: number;
}): Promise<{ users: AdminUser[]; total: number }> {
  const conditions = [
    search
      ? sql`(
          ${users.email} ILIKE ${"%" + search + "%"} OR
          ${users.firstName} ILIKE ${"%" + search + "%"} OR
          ${users.lastName} ILIKE ${"%" + search + "%"}
        )`
      : undefined,
    role ? sql`${users.role} = ${role}` : undefined,
    plan === "premium"
      ? sql`${users.subscriptionStatus} = 'active'`
      : plan === "free"
        ? sql`(${users.subscriptionStatus} IS NULL OR ${users.subscriptionStatus} != 'active')`
        : undefined,
  ].filter(Boolean) as any[];

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        planName: users.planName,
        subscriptionStatus: users.subscriptionStatus,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        deletedAt: users.deletedAt,
        bannedAt: users.bannedAt,
        bannedReason: users.bannedReason,
      })
      .from(users)
      .where(where)
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(perPage)
      .offset((page - 1) * perPage),

    db.select({ count: count() }).from(users).where(where),
  ]);

  return { users: rows, total: totalRows[0].count };
}

export type AdminUserDetail = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  planName: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  bannedAt: Date | null;
  bannedReason: string | null;
};

export async function getAdminUserById(
  id: number,
): Promise<AdminUserDetail | null> {
  const result = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      planName: users.planName,
      subscriptionStatus: users.subscriptionStatus,
      stripeCustomerId: users.stripeCustomerId,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deletedAt: users.deletedAt,
      bannedAt: users.bannedAt,
      bannedReason: users.bannedReason,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result[0] ?? null;
}

export type AdminUserActivity = {
  id: number;
  action: string;
  ipAddress: string | null;
  timestamp: Date;
};

export async function getAdminUserActivity(
  userId: number,
): Promise<AdminUserActivity[]> {
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
