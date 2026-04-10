"use client";

import { Trash2 } from "lucide-react";
import { deleteTemplateAction } from "../actions";

export default function DeleteTemplateButton({ id, name }: { id: number; name: string }) {
  return (
    <form action={deleteTemplateAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title="Elimina template"
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: "var(--admin-error, #dc2626)", border: "1px solid var(--admin-border)" }}
        onClick={(e) => {
          if (!confirm(`Eliminare il template "${name}"?`)) e.preventDefault();
        }}
      >
        <Trash2 size={14} />
      </button>
    </form>
  );
}
