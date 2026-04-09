"use server";

import { updateAppSetting } from "@/lib/db/settings-queries";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  robots_txt: z.string().max(10000),
  humans_txt: z.string().max(10000),
});

export async function saveRobotsAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const raw = {
    robots_txt: formData.get("robots_txt") ?? "",
    humans_txt: formData.get("humans_txt") ?? "",
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  try {
    await Promise.all([
      updateAppSetting("robots_txt" as never, parsed.data.robots_txt || null),
      updateAppSetting("humans_txt" as never, parsed.data.humans_txt || null),
    ]);
    revalidatePath("/robots.txt");
    revalidatePath("/humans.txt");
    revalidatePath("/admin/seo/robots");
  } catch (err) {
    console.error("[saveRobotsAction] error:", err);
    return { error: "Errore nel salvataggio. Riprova." };
  }

  return { success: true };
}
