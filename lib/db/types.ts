/**
 * Tipi condivisi derivati dallo schema Drizzle.
 * Usare sempre questi invece di ridefinire tipi locali nei componenti.
 */
import type { activityLogs } from "@/lib/db/schema";

/**
 * Singola riga del log attività arricchita con l'email utente
 * (join con la tabella users fatto in admin-queries.ts → getActivityLogs).
 */
export type LogEntry = typeof activityLogs.$inferSelect & {
  userEmail: string | null;
};

/**
 * Payload paginato restituito da getActivityLogs.
 */
export type PaginatedLogs = {
  logs: LogEntry[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};
