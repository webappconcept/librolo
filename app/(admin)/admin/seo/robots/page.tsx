import { getAppSettings } from "@/lib/db/settings-queries";
import { Suspense } from "react";
import RobotsEditor from "./_components/robots-editor";

async function RobotsContent() {
  const settings = await getAppSettings();
  const robotsTxt = (settings as Record<string, string | null>)["robots_txt"] ?? "";
  const humansTxt = (settings as Record<string, string | null>)["humans_txt"] ?? "";

  return <RobotsEditor initialRobots={robotsTxt} initialHumans={humansTxt} />;
}

export default function RobotsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--admin-text)" }}>
          Robots
        </h2>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--admin-text-muted)" }}>
          Gestisci i file <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: "var(--admin-hover-bg)" }}>robots.txt</code> e{" "}
          <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: "var(--admin-hover-bg)" }}>humans.txt</code> serviti dall&apos;app.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-32">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--admin-accent)", borderTopColor: "transparent" }}
            />
          </div>
        }>
        <RobotsContent />
      </Suspense>
    </div>
  );
}
