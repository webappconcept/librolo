// app/(admin)/admin/route-registry/page.tsx
import type { Metadata } from "next";
import { getAllRoutes } from "@/lib/db/route-registry-queries";
import {
  deleteRouteAction,
  toggleRouteActiveAction,
  upsertRouteAction,
} from "./actions";
import RouteRegistryClient from "./_components/route-registry-client";

export const metadata: Metadata = { title: "Route Registry" };

export default async function RouteRegistryPage() {
  const rows = await getAllRoutes();
  return (
    <RouteRegistryClient
      rows={rows}
      upsertAction={upsertRouteAction}
      deleteAction={deleteRouteAction}
      toggleActiveAction={toggleRouteActiveAction}
    />
  );
}
