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
import type { GoogleTokens } from "./google";

export interface OAuthProfile {
  provider:          string;
  providerAccountId: string;
  email:             string;
  emailVerified:     boolean;
  firstName:         string | null;
  lastName:          string | null;
  picture:           string | null;
  tokens:            GoogleTokens;
}

export async function findOrCreateOAuthUser(profile: OAuthProfile) {
  const { provider, providerAccountId, email, firstName, lastName, picture, tokens } = profile;

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

    // Aggiorna avatar_url se Google ne ha uno nuovo
    if (picture) {
      await db
        .update(userProfiles)
        .set({ avatarUrl: picture, updatedAt: new Date() })
        .where(eq(userProfiles.userId, existingOAuth.userId));
    }

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

    // Aggiorna avatar_url solo se l'utente non ne ha già uno
    if (picture) {
      await db
        .update(userProfiles)
        .set({ avatarUrl: picture, updatedAt: new Date() })
        .where(
          and(
            eq(userProfiles.userId, existingUser.id),
            // Non sovrascrivere un avatar già caricato manualmente
            // (avatarUrl IS NULL)
          ),
        );
      // Nota: per non sovrascrivere avatar esistenti usiamo una query condizionale
      await db.execute(
        // SQL raw: UPDATE solo se avatar_url IS NULL
        // Drizzle non ha .whereNull() nativo senza import extra
        // Uso query diretta per semplicità
        `UPDATE user_profiles SET avatar_url = $1, updated_at = NOW() WHERE user_id = $2 AND avatar_url IS NULL`,
      );
    }

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
      passwordHash:  "",
      role:          "member",
      isAdmin:       false,
      emailVerified: profile.emailVerified,
    })
    .returning();

  if (!newUser) throw new Error("[oauth] Failed to create user");

  await db.insert(userProfiles).values({
    userId:    newUser.id,
    firstName: firstName ?? null,
    lastName:  lastName  ?? null,
    avatarUrl: picture   ?? null,
    // username: null — l'utente lo imposterà dal profilo
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
