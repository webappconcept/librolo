import { getAllTemplates } from "@/lib/db/template-queries";
import { LAYOUT_BASES } from "@/app/(frontend)/_templates/registry";
import Link from "next/link";
import { PanelTop, Plus, Copy } from "lucide-react";
import { duplicateTemplateAction } from "./actions";
import DeleteTemplateButton from "./_components/delete-template-button";

export const metadata = { title: "Template pagine" };
export const dynamic = "force-dynamic";

export default async function TemplatePage() {
  const templates = await getAllTemplates();

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))",
              border: "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
            }}
          >
            <PanelTop size={18} style={{ color: "var(--admin-accent)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--admin-text)" }}>
              Template pagine
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-muted)" }}>
              Definisci i layout grafici riutilizzabili per le pagine del sito
            </p>
          </div>
        </div>
        <Link
          href="/admin/template/nuovo"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--admin-accent)" }}
        >
          <Plus size={16} />
          Nuovo template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl"
          style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-border)" }}
        >
          <PanelTop size={40} style={{ color: "var(--admin-text-faint)" }} className="mb-4" />
          <p className="font-semibold" style={{ color: "var(--admin-text)" }}>Nessun template</p>
          <p className="text-sm mt-1" style={{ color: "var(--admin-text-muted)" }}>
            Crea il tuo primo template grafico per le pagine del sito
          </p>
          <Link
            href="/admin/template/nuovo"
            className="mt-6 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--admin-accent)" }}
          >
            Crea template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const layoutLabel = LAYOUT_BASES[tpl.layoutBase]?.label ?? tpl.layoutBase;
            return (
              <div
                key={tpl.id}
                className="rounded-xl overflow-hidden"
                style={{
                  background: "var(--admin-card-bg)",
                  border: "1px solid var(--admin-border)",
                }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--admin-text)" }}>
                        {tpl.name}
                        {tpl.isSystem && (
                          <span
                            className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{
                              background: "var(--admin-accent-light)",
                              color: "var(--admin-accent)",
                            }}
                          >
                            sistema
                          </span>
                        )}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--admin-text-muted)" }}>
                        {layoutLabel} &bull; {tpl.fields.length} campi
                      </p>
                    </div>
                  </div>

                  {tpl.description && (
                    <p
                      className="text-xs mt-2 line-clamp-2"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      {tpl.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-4">
                    <Link
                      href={`/admin/template/${tpl.id}`}
                      className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg transition-colors"
                      style={{
                        background: "var(--admin-input-bg)",
                        color: "var(--admin-text)",
                        border: "1px solid var(--admin-border)",
                      }}
                    >
                      Modifica
                    </Link>

                    <form action={duplicateTemplateAction}>
                      <input type="hidden" name="id" value={tpl.id} />
                      <button
                        type="submit"
                        title="Duplica template"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--admin-text-muted)", border: "1px solid var(--admin-border)" }}
                      >
                        <Copy size={14} />
                      </button>
                    </form>

                    {!tpl.isSystem && (
                      <DeleteTemplateButton id={tpl.id} name={tpl.name} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
