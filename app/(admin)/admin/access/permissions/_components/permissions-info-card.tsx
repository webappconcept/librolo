"use client";

import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Code2,
  Info,
  Layers,
  ShieldCheck,
  User,
} from "lucide-react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon size={14} style={{ color: "var(--admin-accent)" }} />
      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--admin-text-muted)" }}>
        {children}
      </span>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
        style={{ background: "var(--admin-accent)" }}>
        {n}
      </span>
      <span
        className="text-sm leading-relaxed"
        style={{ color: "var(--admin-text-muted)" }}>
        {children}
      </span>
    </li>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono"
      style={{
        background: "var(--admin-hover-bg)",
        color: "var(--admin-text)",
        border: "1px solid var(--admin-card-border)",
      }}>
      {children}
    </code>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function PermissionsInfoCard() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--admin-card-border)",
        background: "var(--admin-card-bg)",
      }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
        style={{
          background: open ? "var(--admin-hover-bg)" : "transparent",
        }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background:
              "color-mix(in oklch, var(--admin-accent) 12%, transparent)",
          }}>
          <Info size={14} style={{ color: "var(--admin-accent)" }} />
        </div>
        <div className="flex-1">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--admin-text)" }}>
            How does the permission system work?
          </span>
          <span
            className="block text-xs"
            style={{ color: "var(--admin-text-faint)" }}>
            Quick guide, configuration, and code usage examples
          </span>
        </div>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: "var(--admin-text-faint)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Collapsible Content */}
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: open ? "1200px" : "0px", opacity: open ? 1 : 0 }}>
        <div
          className="px-5 pb-5 pt-1 grid gap-5"
          style={{ borderTop: "1px solid var(--admin-card-border)" }}>
          {/* How it works */}
          <div className="pt-4">
            <SectionTitle icon={BookOpen}>How it works</SectionTitle>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--admin-text-muted)" }}>
              The RBAC (Role-Based Access Control) system is based on three
              overlapping layers:
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                {
                  icon: Layers,
                  title: "Permissions",
                  desc: "Atomic app actions. Use the resource:action pattern, e.g., posts:publish, users:ban.",
                },
                {
                  icon: ShieldCheck,
                  title: "Roles",
                  desc: "Sets of permissions. Assign a set of permissions to each role in Role Management.",
                },
                {
                  icon: User,
                  title: "User Overrides",
                  desc: "Grant or revoke a specific permission for a single user, including expiration dates.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-lg p-3"
                  style={{
                    background: "var(--admin-hover-bg)",
                    border: "1px solid var(--admin-card-border)",
                  }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={13} style={{ color: "var(--admin-accent)" }} />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--admin-text)" }}>
                      {title}
                    </span>
                  </div>
                  <p
                    className="text-[12px] leading-relaxed"
                    style={{ color: "var(--admin-text-faint)" }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Setup */}
          <div>
            <SectionTitle icon={CheckCircle2}>Initial Setup</SectionTitle>
            <ol className="space-y-2.5">
              <Step n={1}>
                Go to the <strong>Permission Catalog</strong> (next tab) and
                create the permissions you need. Use names in the format{" "}
                <Pill>resource:action</Pill>, for example{" "}
                <Pill>posts:publish</Pill>, <Pill>users:ban</Pill>,{" "}
                <Pill>admin:access</Pill>.
              </Step>
              <Step n={2}>
                Go to the <strong>Role Matrix</strong> and use the toggles to
                assign permissions to roles. Each cell is a toggle: green =
                permission granted.
              </Step>
              <Step n={3}>
                For individual exceptions, open a user's details in{" "}
                <strong>Users</strong> → <strong>Access</strong> tab → Overrides
                section. You can grant or revoke a permission with an optional
                expiration date.
              </Step>
              <Step n={4}>
                In your app's code, use the <Pill>can()</Pill> function to
                verify if the current user has a specific permission (see
                example below).
              </Step>
            </ol>
          </div>

          {/* Key Conventions */}
          <div>
            <SectionTitle icon={Layers}>Key Conventions</SectionTitle>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {[
                { key: "admin:access", desc: "Access to admin panel" },
                { key: "users:view", desc: "View user list" },
                { key: "users:ban", desc: "Ban/unban a user" },
                { key: "users:delete", desc: "Delete user account" },
                { key: "posts:create", desc: "Create new content" },
                { key: "posts:publish", desc: "Publish/unpublish content" },
                { key: "posts:delete", desc: "Delete others' content" },
                { key: "comments:delete", desc: "Delete comments" },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center gap-2">
                  <Pill>{key}</Pill>
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--admin-text-faint)" }}>
                    {desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Code Example */}
          <div>
            <SectionTitle icon={Code2}>Code Usage Example</SectionTitle>
            <div
              className="rounded-lg overflow-x-auto"
              style={{
                background: "var(--admin-hover-bg)",
                border: "1px solid var(--admin-card-border)",
              }}>
              <pre
                className="text-[12px] leading-relaxed p-4 font-mono"
                style={{ color: "var(--admin-text-muted)" }}>
                {`// In a Server Component or Server Action
import { can } from "@/lib/rbac/can";
import { getSession } from "@/lib/auth/session";

export default async function PublishButton() {
  const session = await getSession();

  // Check if the user has permission
  const allowed = await can(session.user.id, "posts:publish");

  if (!allowed) {
    return <p>You do not have permission to publish.</p>;
  }

  return <button>Publish</button>;
}

// Or in a Server Action
export async function publishPost(postId: number) {
  const session = await getSession();
  const allowed = await can(session.user.id, "posts:publish");
  if (!allowed) throw new Error("Unauthorized");

  // ... publishing logic
}`}
              </pre>
            </div>
            <p
              className="text-[12px] mt-2"
              style={{ color: "var(--admin-text-faint)" }}>
              The <Pill>can(userId, key)</Pill> function automatically resolves
              roles + individual overrides (grant/revoke) and respects
              expiration dates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
