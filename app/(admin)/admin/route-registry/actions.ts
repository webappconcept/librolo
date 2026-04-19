// app/(admin)/admin/route-registry/actions.ts
"use server";

import {
  createRoute,
  deleteRoute,
  toggleRouteActive,
  updateRoute,
} from "@/lib/db/route-registry-queries";
import type { RouteVisibility } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/rbac/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const REVALIDATE = "/admin/route-registry";

const schema = z.object({
  id: z.string().uuid().optional(),
  pathname: z
    .string()
    .min(1, "Il pathname è obbligatorio")
    .regex(/^\//, { message: "Il pathname deve iniziare con /" }),
  label: z
    .string()
    .min(1, "L'etichetta è obbligatoria")
    .max(150, "Max 150 caratteri"),
  visibility: z.enum(["public", "private", "admin", "auth-only"], {
    error: "Visibilità non valida",
  }),
  inNav:     z.string().optional(),
  inFooter:  z.string().optional(),
  inSitemap: z.string().optional(),
  isActive:  z.string().optional(),
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
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const { id, inNav, inFooter, inSitemap, isActive, ...rest } = parsed.data;
  const data = {
    ...rest,
    visibility: rest.visibility as RouteVisibility,
    inNav:      inNav      === "true",
    inFooter:   inFooter   === "true",
    inSitemap:  inSitemap  !== "false",
    isActive:   isActive   !== "false",
  };

  try {
    if (id) await updateRoute(id, data);
    else    await createRoute(data);
    revalidatePath(REVALIDATE);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate"))
      return { error: "Pathname già registrato." };
    console.error("[upsertRouteAction]", err);
    return { error: "Errore nel salvataggio." };
  }

  return { success: true, savedAt: new Date().toISOString() };
}

export async function deleteRouteAction(
  id: string,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteRoute(id);
    revalidatePath(REVALIDATE);
  } catch (err) {
    console.error("[deleteRouteAction]", err);
    return { error: "Errore nell'eliminazione." };
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
    revalidatePath(REVALIDATE);
  } catch (err) {
    console.error("[toggleRouteActiveAction]", err);
    return { error: "Errore nell'aggiornamento." };
  }
  return { success: true };
}
