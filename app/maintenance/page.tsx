// app/maintenance/page.tsx
import { getAppSettings } from "@/lib/db/settings-queries";

export default async function MaintenancePage() {
  const settings = await getAppSettings();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
      <div className="max-w-md space-y-4">
        <div className="text-5xl">🔧</div>
        <h1 className="text-2xl font-bold text-gray-800">
          {settings.app_name} è in manutenzione
        </h1>
        <p className="text-gray-500 text-sm">Torneremo online a breve.</p>
      </div>
    </div>
  );
}
