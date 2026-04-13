// app/(admin)/admin/users/[id]/page.tsx
import { getAdminUserActivity, getAdminUserById } from "@/lib/db/admin-queries";
import { getAdminRoles } from "@/lib/db/roles-queries";
import { getAllPermissions, getPermissionsByRole, getUserPermissionOverrides, purgeExpiredOverrides } from "@/lib/rbac/permissions-queries";
import { db } from "@/lib/db/drizzle";
import { roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/db/queries";
import { can } from "@/lib/rbac/can";
import {
  Activity,
  ArrowLeft,
  Calendar,
  CreditCard,
  Mail,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActivityList } from "./_components/activity-list";
import { BanButton, DeleteButton, RoleSelector } from "./_components/user-detail-client";
import { UserAccessTab } from "./_components/user-access-tab";
import { UserDetailTabs } from "./_components/user-detail-tabs";

function StatusBadge({ user }: { user: Awaited<ReturnType<typeof getAdminUserById>> }) {
  if (!user) return null;
  if (user.bannedAt)
    return <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Sospeso</span>;
  if (user.deletedAt)
    return (
      <span className="px-2.5 py-1 text-xs font-semibold rounded-full"
        style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)" }}>
        Cancellato
      </span>
    );
  return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">Attivo</span>;
}

async function UserContent({ id, canDelete }: { id: number; canDelete: boolean }) {
  const [user, activity, availableRoles, allPermissions] = await Promise.all([
    getAdminUserById(id),
    getAdminUserActivity(id),
    getAdminRoles(),
    getAllPermissions(),
  ]);

  if (!user) notFound();

  // Auto-purge override scaduti — silenzioso, nessun await bloccante per l'UI
  void purgeExpiredOverrides(id);

  // Carica permessi del ruolo e override in parallelo
  const userRoleRow = await db
    .select()
    .from(roles)
    .where(eq(roles.name, user.role))
    .limit(1)
    .then((r) => r[0] ?? null);

  const [rolePerms, overrides] = await Promise.all([
    userRoleRow ? getPermissionsByRole(userRoleRow.id) : Promise.resolve([]),
    getUserPermissionOverrides(id),
  ]);

  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") || user.email[0].toUpperCase();

  const isPremium = user.subscriptionStatus === "active";

  // Contenuto tab Info
  const infoContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Info account */}
      <div className="rounded-xl shadow-sm p-5"
        style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}>
        <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--admin-text)" }}>Informazioni account</h4>
        <div className="space-y-3">
          {[
            { icon: Mail, label: "Email", value: user.email },
            { icon: Calendar, label: "Iscritto il", value: new Date(user.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) },
            { icon: CreditCard, label: "Piano", value: user.planName ?? "Free" },
            { icon: isPremium ? ShieldCheck : ShieldX, label: "Stripe", value: user.stripeCustomerId ?? "Non collegato" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--admin-hover-bg)" }}>
                <Icon size={13} style={{ color: "var(--admin-text-faint)" }} />
              </div>
              <div>
                <p className="text-[11px]" style={{ color: "var(--admin-text-faint)" }}>{label}</p>
                <p className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gestione ruolo */}
      <div className="rounded-xl shadow-sm p-5"
        style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>Ruolo</h4>
          <Link href="/admin/roles" className="text-xs transition-colors" style={{ color: "var(--admin-accent)" }}>
            Gestisci ruoli →
          </Link>
        </div>
        <RoleSelector user={user} availableRoles={availableRoles} />
      </div>
    </div>
  );

  // Contenuto tab Attività
  const activityContent = (
    <div className="rounded-xl shadow-sm p-5"
      style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Activity size={15} style={{ color: "var(--admin-text-faint)" }} />
        <h4 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>Attività recente</h4>
      </div>
      <Suspense fallback={<p className="text-sm" style={{ color: "var(--admin-text-faint)" }}>Caricamento...</p>}>
        <ActivityList activity={activity} />
      </Suspense>
    </div>
  );

  // Contenuto tab Accessi
  const accessContent = (
    <UserAccessTab
      userId={id}
      rolePerms={rolePerms}
      overrides={overrides}
      allPermissions={allPermissions}
      userRole={userRoleRow}
    />
  );

  return (
    <div className="space-y-6">
      {/* Header utente */}
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 text-white"
          style={{ background: "var(--admin-accent)" }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold" style={{ color: "var(--admin-text)" }}>
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email}
            </h2>
            <StatusBadge user={user} />
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-muted)" }}>
            {user.email} · ID #{user.id}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <BanButton user={user} />
          <DeleteButton user={user} canDelete={canDelete} />
        </div>
      </div>

      {/* Tabs */}
      <UserDetailTabs
        infoContent={infoContent}
        activityContent={activityContent}
        accessContent={accessContent}
        overridesCount={overrides.length}
      />
    </div>
  );
}

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  if (!userId || isNaN(userId)) notFound();

  // Calcola canDelete per l'admin corrente
  const currentUser = await getUser();
  const canDelete = currentUser
    ? currentUser.isAdmin || (await can(currentUser, "users:delete"))
    : false;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: "var(--admin-text-muted)" }}>
        <ArrowLeft size={14} />
        Tutti gli utenti
      </Link>
      <Suspense
        fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-14 rounded-2xl" style={{ background: "var(--admin-hover-bg)" }} />
            <div className="h-64 rounded-xl" style={{ background: "var(--admin-hover-bg)" }} />
          </div>
        }>
        <UserContent id={userId} canDelete={canDelete} />
      </Suspense>
    </div>
  );
}
