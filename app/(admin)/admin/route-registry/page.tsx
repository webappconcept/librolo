// app/(admin)/admin/route-registry/page.tsx
import type { Metadata } from "next";
import { getAllRoutes } from "@/lib/db/route-registry-queries";
import {
  deleteRouteAction,
  toggleRouteActiveAction,
  upsertRouteAction,
} from "./actions";
import RouteRegistryClient from "./_components/route-registry-client";
import { SeoHeader } from "@/app/(admin)/admin/seo/_components/seo-header";

export const metadata: Metadata = { title: "SEO / Route Registry" };

export default async function RouteRegistryPage() {
  const rows = await getAllRoutes();
  return (
    <div className="space-y-5">
      <SeoHeader />
      <RouteRegistryClient
        rows={rows}
        upsertAction={upsertRouteAction}
        deleteAction={deleteRouteAction}
        toggleActiveAction={toggleRouteActiveAction}
      />
    </div>
  );
}
