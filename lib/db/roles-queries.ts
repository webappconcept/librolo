// lib/db/roles-queries.ts
import { db } from "@/lib/db/drizzle";
import { roles } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import "server-only";

export type RoleRow = {
  id: number;
  name: string;
  label: string;
  color: string;
  description: string | null;
  isAdmin: boolean;
  isStaff: boolean;
  isSystem: boolean;
  sortOrder: number;
};

export async function getAdminRoles(): Promise<RoleRow[]> {
  return db
    .select({
      id: roles.id,
      name: roles.name,
      label: roles.label,
      color: roles.color,
      description: roles.description,
      isAdmin: roles.isAdmin,
      isStaff: roles.isStaff,
      isSystem: roles.isSystem,
      sortOrder: roles.sortOrder,
    })
    .from(roles)
    .orderBy(asc(roles.sortOrder), asc(roles.name));
}
