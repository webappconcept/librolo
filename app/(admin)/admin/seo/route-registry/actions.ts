"use server";

import { getAdminPath } from "@/lib/admin-nav";
import {
  createRoute,
  deleteRoute,
  getAllRoutes,
  toggleRouteActive,
  updateRoute,
} from "@/lib/db/route-registry-queries";
import type { RouteVisibility } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/rbac/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  id: z.uuid({ message: "ID not valid" }).optional(),
  pathname: z
    .string()
    .min(1, "Pathname is mandatory")
    .regex(/^\//, { message: "Pathname must starts with /" }),
  label: z.string().min(1, "Label is mandatory").max(150, "Max 150 characters"),
  visibility: z.enum(["public", "private", "admin", "auth-only"], {
    error: "Visibility not valid",
  }),
  isActive: z.string().optional(),
});

type ActionResult = { error?: string; success?: boolean; savedAt?: string };

export async function upsertRouteAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Data not valid" };

  const { id, isActive, ...rest } = parsed.data;
  const data = {
    ...rest,
    visibility: rest.visibility as RouteVisibility,
    isActive: isActive !== "false",
  };

  try {
    if (id) await updateRoute(id, data);
    else await createRoute(data);
    revalidatePath(getAdminPath("seo-registry"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate"))
      return { error: "Pathname already registered." };
    console.error("[upsertRouteAction]", err);
    return { error: "Error while saving." };
  }

  return { success: true, savedAt: new Date().toISOString() };
}

export async function deleteRouteAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    const rows = await getAllRoutes();
    const route = rows.find((row) => row.id === id);
    if (route?.isSystemRoute) {
      return { error: "System routes can't be deleted." };
    }

    await deleteRoute(id);
    revalidatePath(getAdminPath("seo-registry"));
  } catch (err) {
    console.error("[deleteRouteAction]", err);
    return { error: "Error while deleting." };
  }
  return { success: true };
}

export async function toggleRouteActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await toggleRouteActive(id, isActive);
    revalidatePath(getAdminPath("seo-registry"));
  } catch (err) {
    console.error("[toggleRouteActiveAction]", err);
    return { error: "Error while updating." };
  }
  return { success: true };
}
