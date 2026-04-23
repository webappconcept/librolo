import { getUser } from "@/lib/db/queries";
import { User } from "@/lib/db/schema";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

/**
 * Stato restituito dalle Server Actions.
 * Se in futuro servono campi aggiuntivi, aggiungili esplicitamente qui
 * invece di usare un index signature generico.
 * Esempio: errors?: Record<string, string[]>
 */
export type ActionState = {
  error?: string;
  success?: string;
};

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
) => Promise<T>;

export function validatedAction<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>,
) {
  return async (prevState: ActionState, formData: FormData) => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message };
    }

    try {
      return await action(result.data, formData);
    } catch (err) {
      // NEXT_REDIRECT non è un errore reale: è il meccanismo interno
      // con cui Next.js 15+ esegue i redirect dalle Server Actions.
      // Deve essere rilanciato, non catturato, altrimenti il redirect
      // viene inghiottito e l'utente resta sulla stessa pagina.
      if (isRedirectError(err)) throw err;
      throw err;
    }
  };
}

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User,
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>,
) {
  return async (prevState: ActionState, formData: FormData) => {
    const user = await getUser();
    if (!user) {
      throw new Error("User is not authenticated");
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message };
    }

    try {
      return await action(result.data, formData, user);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      throw err;
    }
  };
}
