"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteTemplateAction } from "../actions";
import ConfirmModal from "@/app/(admin)/admin/_components/confirm-modal";

interface Props {
  id: number;
  name: string;
  pageCount: number;
}

export default function DeleteTemplateButton({ id, name, pageCount }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", String(id));
      await deleteTemplateAction(fd);
      setOpen(false);
    });
  }

  const inUse = pageCount > 0;

  const message = inUse ? (
    <>
      Il template <strong style={{ color: "var(--admin-text)" }}>"{name}"</strong> è usato da{
        " "
      }
      <strong style={{ color: "var(--admin-text)" }}>
        {pageCount} {pageCount === 1 ? "pagina" : "pagine"}
      </strong>.
      <br /><br />
      Eliminandolo, quelle pagine non avranno più un template assegnato e
      useranno il layout di default. L&apos;operazione è irreversibile.
    </>
  ) : (
    <>
      Eliminare il template <strong style={{ color: "var(--admin-text)" }}>"{name}"</strong>?{
        " "
      }
      L&apos;operazione è irreversibile.
    </>
  );

  return (
    <>
      <button
        type="button"
        title="Elimina template"
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: "var(--admin-error, #dc2626)", border: "1px solid var(--admin-border)" }}
      >
        <Trash2 size={14} />
      </button>

      <ConfirmModal
        open={open}
        title={inUse ? `Template in uso — elimina comunque?` : `Elimina template`}
        message={message}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant={inUse ? "warning" : "danger"}
        loading={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
