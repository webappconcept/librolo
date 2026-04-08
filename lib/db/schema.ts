import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  /** Guard indipendente dalla label del ruolo — usato da middleware e Server Actions */
  isAdmin: boolean("is_admin").notNull().default(false),
  /** Guard per staff (editor, support, admin) */
  isStaff: boolean("is_staff").notNull().default(false),
  bannedAt: timestamp("banned_at"),
  bannedReason: varchar("banned_reason", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeProductId: varchar("stripe_product_id", { length: 255 }),
  planName: varchar("plan_name", { length: 100 }),
  subscriptionStatus: varchar("subscription_status", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  emailVerified: boolean("email_verified").notNull().default(false),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).notNull().default("#6b7280"),
  description: text("description"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isStaff: boolean("is_staff").notNull().default(false),
  /** I ruoli di sistema non possono essere eliminati dall'UI */
  isSystem: boolean("is_system").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
});

export const ipBlacklist = pgTable("ip_blacklist", {
  id: serial("id").primaryKey(),
  ip: varchar("ip", { length: 45 }).notNull().unique(),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  ip: varchar("ip", { length: 45 }).notNull(),
  attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
  success: boolean("success").notNull().default(false),
});

export const emailVerifications = pgTable("email_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const seoPages = pgTable("seo_pages", {
  pathname: varchar("pathname", { length: 255 }).primaryKey(),
  label: varchar("label", { length: 100 }).notNull(),
  title: varchar("title", { length: 70 }),
  description: varchar("description", { length: 160 }),
  ogTitle: varchar("og_title", { length: 70 }),
  ogDescription: varchar("og_description", { length: 200 }),
  ogImage: text("og_image"),
  robots: varchar("robots", { length: 50 }),
  jsonLdEnabled: boolean("json_ld_enabled").notNull().default(false),
  jsonLdType: varchar("json_ld_type", { length: 50 }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type EmailVerification = typeof emailVerifications.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type SeoPage = typeof seoPages.$inferSelect;
export type NewSeoPage = typeof seoPages.$inferInsert;

export enum ActivityType {
  SIGN_UP = "SIGN_UP",
  SIGN_IN = "SIGN_IN",
  SIGN_OUT = "SIGN_OUT",
  UPDATE_PASSWORD = "UPDATE_PASSWORD",
  DELETE_ACCOUNT = "DELETE_ACCOUNT",
  UPDATE_ACCOUNT = "UPDATE_ACCOUNT",
  EMAIL_VERIFIED = "EMAIL_VERIFIED",
  EMAIL_CHANGED = "EMAIL_CHANGED",
  PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED",
  SUBSCRIPTION_STARTED = "SUBSCRIPTION_STARTED",
  SUBSCRIPTION_CANCELLED = "SUBSCRIPTION_CANCELLED",
  SUBSCRIPTION_RENEWED = "SUBSCRIPTION_RENEWED",
  SUBSCRIPTION_UPGRADED = "SUBSCRIPTION_UPGRADED",
  SUBSCRIPTION_DOWNGRADED = "SUBSCRIPTION_DOWNGRADED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  ADMIN_BAN_USER = "ADMIN_BAN_USER",
  ADMIN_UNBAN_USER = "ADMIN_UNBAN_USER",
  ADMIN_CHANGE_ROLE = "ADMIN_CHANGE_ROLE",
  ADMIN_DELETE_USER = "ADMIN_DELETE_USER",
  AVATAR_UPDATED = "AVATAR_UPDATED",
  BIO_UPDATED = "BIO_UPDATED",
  PROFILE_VIEWED = "PROFILE_VIEWED",
  POST_CREATED = "POST_CREATED",
  POST_EDITED = "POST_EDITED",
  POST_DELETED = "POST_DELETED",
  COMMENT_CREATED = "COMMENT_CREATED",
  COMMENT_DELETED = "COMMENT_DELETED",
  LIKE_ADDED = "LIKE_ADDED",
  LIKE_REMOVED = "LIKE_REMOVED",
  FOLLOW_USER = "FOLLOW_USER",
  UNFOLLOW_USER = "UNFOLLOW_USER",
  BLOCK_USER = "BLOCK_USER",
  UNBLOCK_USER = "UNBLOCK_USER",
  NOTIFICATION_READ = "NOTIFICATION_READ",
  MESSAGE_SENT = "MESSAGE_SENT",
  CONTENT_REPORTED = "CONTENT_REPORTED",
  CONTENT_REMOVED = "CONTENT_REMOVED",
}
