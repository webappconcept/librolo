// lib/db/queries.ts
import { verifyToken } from "@/lib/auth/session";
import { and, desc, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./drizzle";
import { activityLogs, users } from "./schema";

async function getUserInternal() {
  const sessionCookie = (await cookies()).get("session");
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  // verifyToken (jose jwtVerify) throws on malformed / tampered / expired
  // tokens — catch and treat as "no session" instead of crashing the request.
  let sessionData: Awaited<ReturnType<typeof verifyToken>> | null = null;
  try {
    sessionData = await verifyToken(sessionCookie.value);
  } catch {
    return null;
  }

  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== "string"
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, sessionData.user.id),
        isNull(users.deletedAt),
        isNull(users.bannedAt),
      ),
    )
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export const getUser = cache(getUserInternal);

export async function getUserByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateUserSubscription(
  userId: string,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  },
) {
  await db
    .update(users)
    .set({
      ...subscriptionData,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error("Utente non loggato");
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.firstName,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}
