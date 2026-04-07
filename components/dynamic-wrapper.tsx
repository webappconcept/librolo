import { getUser } from "@/lib/db/queries";
import { SWRConfig } from "swr";

export async function DynamicWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

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
