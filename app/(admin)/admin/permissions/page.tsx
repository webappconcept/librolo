// app/(admin)/admin/permissions/page.tsx
import type { Metadata } from "next";
import { getAllPermissions } from "@/lib/rbac/permissions-queries";
import { getAdminRoles } from "@/lib/db/roles-queries";
import { db } from "@/lib/db/drizzle";
import { rolePermissions } from "@/lib/db/schema";
import { requireAdminPage } from "@/lib/rbac/guards";
import { SYSTEM_PERMISSIONS } from "@/lib/rbac/system-permissions";
import { KeyRound } from "lucide-react";
import { Suspense } from "react";
import { PermissionsManager } from "./_components/permissions-manager";
import { PermissionsInfoCard } from "./_components/permissions-info-card";

export const metadata: Metadata = { title: "Utenti / Permessi" };

async function PermissionsContent() {
  const [allPermissions, roles, matrix] = await Promise.all([
    getAllPermissions(),
    getAdminRoles(),
    db.select({ roleId: rolePermissions.roleId, permissionId: rolePermissions.permissionId }).from(rolePermissions),
  ]);

  const systemKeys = SYSTEM_PERMISSIONS.map((p) => ({
    key: p.key,
    description: p.description,
    group: p.group,
  }));

  return (
    <PermissionsManager
      permissions={allPermissions}
      roles={roles}
      rolePermissions={matrix}
      systemKeys={systemKeys}
    />
  );
}

export default async function AdminPermissionsPage() {
  await requireAdminPage();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))",
            border: "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
          }}
        >
          <KeyRound size={18} style={{ color: "var(--admin-accent)" }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--admin-text)" }}>
            <span style={{ color: "var(--admin-text-muted)" }}>Utenti</span>
            <span style={{ color: "var(--admin-text-faint)" }}> / </span>
            <span>Permessi</span>
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
            Gestisci il catalogo dei permessi e la matrice ruoli → permessi.
          </p>
        </div>
      </div>

      <PermissionsInfoCard />

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-40">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--admin-accent)", borderTopColor: "transparent" }}
            />
          </div>
        }
      >
        <PermissionsContent />
      </Suspense>
    </div>
  );
}
