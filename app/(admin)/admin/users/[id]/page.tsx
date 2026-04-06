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
      <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-500 rounded-full">
        Cancellato
      </span>
    );
  return (
    <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
      Attivo
    </span>
  );
}

function ActivityIcon({ action }: { action: string }) {
  const map: Record<string, string> = {
    SIGN_IN: "🔐",
    SIGN_OUT: "🚪",
    SIGN_UP: "✨",
    UPDATE_PASSWORD: "🔑",
    UPDATE_ACCOUNT: "✏️",
    DELETE_ACCOUNT: "🗑️",
  };
  return <span>{map[action] ?? "📋"}</span>;
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#e07a3a] flex items-center justify-center text-white text-xl font-bold shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-gray-800">
                  {user.firstName} {user.lastName}
                </h3>
                <StatusBadge user={user} />
              </div>
              <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
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
                    user.emailVerified ? "text-emerald-600" : "text-gray-400"
                  }`}>
                  {user.emailVerified
                    ? "✓ Email verificata"
                    : "Email non verificata"}
                </span>
              </div>
            </div>
          </div>

          {/* Azioni */}
          <div className="flex items-center gap-2">
            <BanButton user={user} />
          </div>
        </div>

        {/* Ban reason */}
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">
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
                <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">{label}</p>
                  <p className="text-sm text-gray-700 font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ruolo */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Ruolo</h4>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Ruolo attuale</p>
              <RoleSelector user={user} />
            </div>
            <p className="text-xs text-gray-400">
              Modificando il ruolo l'utente avrà accesso immediato alle
              funzionalità corrispondenti.
            </p>
          </div>
        </div>
      </div>

      {/* Storico attività */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={15} className="text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-700">
            Attività recenti
          </h4>
          <span className="text-xs text-gray-400">({activity.length})</span>
        </div>

        {activity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Nessuna attività registrata.
          </p>
        ) : (
          <div className="space-y-1">
            {activity.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <ActivityIcon action={log.action} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 font-medium">
                    {log.action
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/^\w/, (c) => c.toUpperCase())}
                  </p>
                  {log.ipAddress && (
                    <p className="text-xs text-gray-400">IP: {log.ipAddress}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(log.timestamp).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
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
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={15} />
          Utenti
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-600 font-medium">Dettaglio</span>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-[#e07a3a] border-t-transparent rounded-full animate-spin" />
          </div>
        }>
        <UserContent id={userId} />
      </Suspense>
    </div>
  );
}
