// app/(admin)/admin/_components/admin-page-header.tsx
import type { LucideIcon } from "lucide-react";

type Props = {
  /** Lucide icon for the section */
  icon: LucideIcon;
  /** Top-level section name (e.g. "Impostazioni", "Utenti") */
  section: string;
  /** Subsection name for nested pages (e.g. "SignIn", "Generale") */
  subsection?: string;
  /** Short description shown below the title */
  description: string;
};

/**
 * Shared page header for all admin sections.
 *
 * Usage — top-level section:
 *   <AdminPageHeader icon={Users} section="Utenti" description="..." />
 *
 * Usage — nested subsection:
 *   <AdminPageHeader icon={LogIn} section="Impostazioni" subsection="SignIn" description="..." />
 */
export function AdminPageHeader({ icon: Icon, section, subsection, description }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))",
          border: "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
        }}
      >
        <Icon size={18} style={{ color: "var(--admin-accent)" }} />
      </div>
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--admin-text)" }}>
          {subsection ? (
            <>
              <span style={{ color: "var(--admin-text-muted)" }}>{section}</span>
              <span style={{ color: "var(--admin-text-faint)" }}> / </span>
              <span>{subsection}</span>
            </>
          ) : (
            section
          )}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
          {description}
        </p>
      </div>
    </div>
  );
}
