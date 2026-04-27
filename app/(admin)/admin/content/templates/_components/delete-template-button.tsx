"use client";

import ConfirmModal from "@/app/(admin)/admin/_components/confirm-modal";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteTemplateAction } from "../actions";

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
      Il template{" "}
      <strong style={{ color: "var(--admin-text)" }}>"{name}"</strong> è usato
      da{" "}
      <strong style={{ color: "var(--admin-text)" }}>
        {pageCount} {pageCount === 1 ? "pagina" : "pagine"}
      </strong>
      .
      <br />
      <br />
      Removing it will leave those pages without an assigned template, and they
      will use the default layout. This action is irreversible.
    </>
  ) : (
    <>
      Delete the Template{" "}
      <strong style={{ color: "var(--admin-text)" }}>"{name}"</strong>? This
      action is irreversible.
    </>
  );

  return (
    <>
      <button
        type="button"
        title="Delete Template"
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg transition-colors"
        style={{
          color: "var(--admin-error, #dc2626)",
          border: "1px solid var(--admin-border)",
        }}>
        <Trash2 size={14} />
      </button>

      <ConfirmModal
        open={open}
        title={
          inUse ? `Template is in use — deleting anyway?` : `Delete Template`
        }
        message={message}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant={inUse ? "warning" : "danger"}
        loading={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
