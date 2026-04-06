import { getAdminUserActivity, getAdminUserById } from "@/lib/db/admin-queries";
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
import { BanButton, RoleSelector } from "./_components/user-detail-client";

function StatusBadge({
  user,
}: {
  user: Awaited<ReturnType<typeof getAdminUserById>>;
}) {
  if (!user) return null;
  if (user.bannedAt)
    return (
      <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
        Sospeso
      </span>
    );
  if (user.deletedAt)
    return (
      <span
        className="px-2.5 py-1 text-xs font-semibold rounded-full"
        style={{
          background: "var(--admin-hover-bg)",
          color: "var(--admin-text-muted)",
        }}>
        Cancellato
      </span>
    );
  return (
    <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
      Attivo
    </span>
  );
}

async function UserContent({ id }: { id: number }) {
  const [user, activity] = await Promise.all([
    getAdminUserById(id),
    getAdminUserActivity(id),
  ]);

  if (!user) notFound();

  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") || user.email[0].toUpperCase();

  const isPremium = user.subscriptionStatus === "active";

  return (
    <div className="space-y-6">
      {/* Header profilo */}
      <div
        className="rounded-xl shadow-sm p-6"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
              style={{ background: "var(--admin-accent)" }}>
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className="text-lg font-bold"
                  style={{ color: "var(--admin-text)" }}>
                  {user.firstName} {user.lastName}
                </h3>
                <StatusBadge user={user} />
              </div>
              <p
                className="text-sm mt-0.5"
                style={{ color: "var(--admin-text-faint)" }}>
                {user.email}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isPremium
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                  {isPremium ? "Premium" : "Free"}
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    user.emailVerified
                      ? "text-emerald-600"
                      : "text-[var(--admin-text-faint)]"
                  }`}>
                  {user.emailVerified
                    ? "✓ Email verificata"
                    : "Email non verificata"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <BanButton user={user} />
          </div>
        </div>

        {user.bannedAt && user.bannedReason && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-xs font-medium text-red-600">
              Motivo sospensione
            </p>
            <p className="text-sm text-red-700 mt-0.5">{user.bannedReason}</p>
            <p className="text-xs text-red-400 mt-1">
              Il{" "}
              {new Date(user.bannedAt).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info account */}
        <div
          className="rounded-xl shadow-sm p-5"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}>
          <h4
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--admin-text)" }}>
            Informazioni account
          </h4>
          <div className="space-y-3">
            {[
              { icon: Mail, label: "Email", value: user.email },
              {
                icon: Calendar,
                label: "Iscritto il",
                value: new Date(user.createdAt).toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
              },
              {
                icon: CreditCard,
                label: "Piano",
                value: user.planName ?? "Free",
              },
              {
                icon: isPremium ? ShieldCheck : ShieldX,
                label: "Stripe",
                value: user.stripeCustomerId ?? "Non collegato",
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--admin-hover-bg)" }}>
                  <Icon
                    size={13}
                    style={{ color: "var(--admin-text-faint)" }}
                  />
                </div>
                <div>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--admin-text-faint)" }}>
                    {label}
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--admin-text)" }}>
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ruolo */}
        <div
          className="rounded-xl shadow-sm p-5"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}>
          <h4
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--admin-text)" }}>
            Ruolo
          </h4>
          <div className="space-y-3">
            <div>
              <p
                className="text-xs mb-1.5"
                style={{ color: "var(--admin-text-faint)" }}>
                Ruolo attuale
              </p>
              <RoleSelector user={user} />
            </div>
            <p className="text-xs" style={{ color: "var(--admin-text-faint)" }}>
              Modificando il ruolo l'utente avrà accesso immediato alle
              funzionalità corrispondenti.
            </p>
          </div>
        </div>
      </div>

      {/* Storico attività */}
      <div
        className="rounded-xl shadow-sm p-5"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={15} style={{ color: "var(--admin-text-faint)" }} />
          <h4
            className="text-sm font-semibold"
            style={{ color: "var(--admin-text)" }}>
            Attività recenti
          </h4>
          <span
            className="text-xs"
            style={{ color: "var(--admin-text-faint)" }}>
            ({activity.length})
          </span>
        </div>
        <ActivityList activity={activity} />
      </div>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  if (isNaN(userId)) notFound();

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/admin/users"
          className="admin-breadcrumb-link flex items-center gap-1.5 text-sm">
          <ArrowLeft size={15} />
          Utenti
        </Link>
        <span style={{ color: "var(--admin-divider)" }}>/</span>
        <span
          className="text-sm font-medium"
          style={{ color: "var(--admin-text-muted)" }}>
          Dettaglio
        </span>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-40">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{
                borderColor: "var(--admin-accent)",
                borderTopColor: "transparent",
              }}
            />
          </div>
        }>
        <UserContent id={userId} />
      </Suspense>
    </div>
  );
}
