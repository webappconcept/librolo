// app/(admin)/admin/users/page.tsx
import { getAdminUsers } from "@/lib/db/admin-queries";
import { Search } from "lucide-react";
import { Suspense } from "react";
import UsersTable from "./_components/users-table";

async function UsersContent({
  search,
  role,
  plan,
  page,
}: {
  search: string;
  role: string;
  plan: string;
  page: number;
}) {
  const { users, total } = await getAdminUsers({ search, role, plan, page });
  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <p className="text-sm text-gray-400 -mt-4">{total} utenti totali</p>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <UsersTable users={users} />

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">
              Pagina {page} di {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`/admin/users?q=${search}&role=${role}&plan=${plan}&page=${page - 1}`}
                  className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  ← Precedente
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/admin/users?q=${search}&role=${role}&plan=${plan}&page=${page + 1}`}
                  className="px-3 py-1.5 text-xs bg-[#e07a3a] text-white rounded-lg hover:bg-[#c9642a] transition-colors">
                  Successiva →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
            <div className="h-2.5 bg-gray-50 rounded animate-pulse w-1/2" />
          </div>
          <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    plan?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const search = params.q ?? "";
  const role = params.role ?? "";
  const plan = params.plan ?? "";
  const page = Number(params.page ?? 1);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">Utenti</h2>

      {/* Filtri — sincroni, nessun DB */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <form className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              name="q"
              defaultValue={search}
              placeholder="Cerca per nome o email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/30 focus:border-[#e07a3a]"
            />
          </div>
          <select
            name="role"
            defaultValue={role}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white text-gray-600">
            <option value="">Tutti i ruoli</option>
            <option value="member">Member</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
          </select>
          <select
            name="plan"
            defaultValue={plan}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white text-gray-600">
            <option value="">Tutti i piani</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-[#e07a3a] text-white text-sm font-medium rounded-lg hover:bg-[#c9642a] transition-colors">
            Filtra
          </button>
          {(search || role || plan) && (
            <a
              href="/admin/users"
              className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
              Reset
            </a>
          )}
        </form>
      </div>

      {/* Tabella con Suspense */}
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersContent search={search} role={role} plan={plan} page={page} />
      </Suspense>
    </div>
  );
}
