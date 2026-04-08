import { getUser } from "@/lib/db/queries";
import { SWRProvider } from "@/components/swr-provider";

export async function DynamicWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <SWRProvider fallback={{ "/api/user": user }}>
      {children}
    </SWRProvider>
  );
}
