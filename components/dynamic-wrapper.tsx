import { getUser } from "@/lib/db/queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import { SWRConfig } from "swr";

import MaintenancePage from "@/app/maintenance/page";

export async function DynamicWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, user] = await Promise.all([getAppSettings(), getUser()]);

  if (settings.maintenance_mode === "true" && user?.role !== "admin") {
    return <MaintenancePage />;
  }

  return (
    <SWRConfig
      value={{
        fallback: {
          "/api/user": user,
        },
      }}>
      {children}
    </SWRConfig>
  );
}
