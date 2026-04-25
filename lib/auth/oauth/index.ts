// lib/auth/oauth/index.ts
//
// findOrCreateOAuthUser — upsert utente + profilo + oauth_account.
// Usato dal callback di ogni provider OAuth.
//
// Logica:
//   A) L'account OAuth esiste già  → aggiorna tokens, ritorna user
//   B) Esiste un user con la stessa email → collega l'account OAuth, ritorna user
//   C) Nessun match → crea user + profile + oauth_account

import { db } from "@/lib/db/drizzle";
import { oauthAccounts, userProfiles, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { GoogleTokens, GoogleUser } from "./google";

export interface OAuthProfile {
  provider:          string;
  providerAccountId: string;
  email:             string;
  emailVerified:     boolean;
  firstName:         string | null;
  lastName:          string | null;
  picture:           string | null;
  tokens:            GoogleTokens; // in futuro: OAuthTokens generico
}

export async function findOrCreateOAuthUser(profile: OAuthProfile) {
  const { provider, providerAccountId, email, firstName, lastName, tokens } = profile;

  // ------------------------------------------------------------------
  // A) Account OAuth già presente → aggiorna tokens e ritorna l'utente
  // ------------------------------------------------------------------
  const [existingOAuth] = await db
    .select({ userId: oauthAccounts.userId })
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerAccountId, providerAccountId),
      ),
    )
    .limit(1);

  if (existingOAuth) {
    // Aggiorna tokens (access_token può ruotare, refresh_token solo se presente)
    await db
      .update(oauthAccounts)
      .set({
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt:    tokens.expires_at ?? undefined,
        updatedAt:    new Date(),
      })
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, providerAccountId),
        ),
      );

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingOAuth.userId))
      .limit(1);

    return user ?? null;
  }

  // ------------------------------------------------------------------
  // B) Utente con stessa email esiste → collega il nuovo account OAuth
  // ------------------------------------------------------------------
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    await db.insert(oauthAccounts).values({
      userId:            existingUser.id,
      provider,
      providerAccountId,
      accessToken:       tokens.access_token,
      refreshToken:      tokens.refresh_token,
      expiresAt:         tokens.expires_at,
      scope:             tokens.scope,
    });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingUser.id))
      .limit(1);

    return user ?? null;
  }

  // ------------------------------------------------------------------
  // C) Nessun match → crea user + profile + oauth_account
  // ------------------------------------------------------------------
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash: "", // nessuna password per utenti OAuth
      role:         "member",
      isAdmin:      false,
      emailVerified: profile.emailVerified,
    })
    .returning();

  if (!newUser) throw new Error("[oauth] Failed to create user");

  await db.insert(userProfiles).values({
    userId:    newUser.id,
    firstName: firstName ?? null,
    lastName:  lastName  ?? null,
  });

  await db.insert(oauthAccounts).values({
    userId:            newUser.id,
    provider,
    providerAccountId,
    accessToken:       tokens.access_token,
    refreshToken:      tokens.refresh_token,
    expiresAt:         tokens.expires_at,
    scope:             tokens.scope,
  });

  return newUser;
}
