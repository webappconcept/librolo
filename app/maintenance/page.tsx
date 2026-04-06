// app/maintenance/page.tsx
import { getAppSettings } from "@/lib/db/settings-queries";
import { Suspense } from "react";

async function MaintenanceContent() {
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

export default function MaintenancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
      <MaintenanceContent />
    </Suspense>
  );
}
