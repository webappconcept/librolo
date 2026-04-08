"use client";

import { useEffect } from "react";
import { mutate } from "swr";

/**
 * Rivalidates /api/user quando l'utente torna sulla pagina
 * tramite il pulsante back/forward del browser (bfcache).
 * Componente client minimale estratto da (protected)/layout.tsx
 * per non inquinare il layout con 'use client'.
 */
export function PageShowRevalidator() {
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) mutate("/api/user");
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
