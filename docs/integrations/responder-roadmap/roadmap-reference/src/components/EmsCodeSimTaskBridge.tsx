"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { Card } from "@/components/ui";

type AssignmentDetail = {
  id: string;
  taskBookTitle: string;
  membershipId?: string;
  upNext: Array<{ requirementId: string; title: string; locked: boolean }>;
  sections: Array<{
    requirements: Array<{
      id: string;
      title: string;
      description: string;
      instructions: string;
      objectives: string[];
      referenceUrl?: string | null;
      locked: boolean;
      completion: { status: string } | null;
    }>;
  }>;
};

type LaunchResponse = {
  launchUrl: string;
  drillTitle: string;
  estimatedMinutes?: number;
};

const EMS_TERMS = [
  "assessment", "airway", "bvm", "respiratory", "stroke", "chest pain", "acs",
  "anaphylaxis", "hypoglycemia", "hemorrhage", "tourniquet", "radio report",
  "pcr", "narrative", "cardiac arrest", "emscodesim", "ems drill"
];

function supportsEms(...values: Array<string | string[] | null | undefined>) {
  const text = values.flatMap((value) => (Array.isArray(value) ? value : [value || ""])).join(" ").toLowerCase();
  return EMS_TERMS.some((term) => text.includes(term)) || /ems-[a-z0-9-]+-\d{3}/i.test(text);
}

export function EmsCodeSimTaskBridge() {
  const pathname = usePathname();
  const assignmentId = useMemo(
    () => (pathname.startsWith("/my-task-books/") ? pathname.split("/")[2] || "" : ""),
    [pathname]
  );
  const [data, setData] = useState<AssignmentDetail | null>(null);
  const [launches, setLaunches] = useState<Record<string, LaunchResponse>>({});

  useEffect(() => {
    setData(null);
    if (!assignmentId) return;
    api<AssignmentDetail>(`assignments/${assignmentId}`).then(setData).catch(() => setData(null));
  }, [assignmentId]);

  if (!assignmentId || !data) return null;

  const requirements = data.sections.flatMap((section) => section.requirements);
  const matches = data.upNext
    .map((item) => requirements.find((req) => req.id === item.requirementId))
    .filter((req) => req && !req.locked && req.completion?.status !== "APPROVED" && supportsEms(req.title, req.description, req.instructions, req.objectives, req.referenceUrl))
    .slice(0, 3) as AssignmentDetail["sections"][number]["requirements"];

  if (!matches.length) return null;

  async function startDrill(requirementId: string) {
    const result = await api<LaunchResponse>(`integrations/emscodesim/launch`, {
      method: "POST",
      body: JSON.stringify({ assignmentId, requirementId, returnUrl: window.location.href })
    });
    setLaunches((current) => ({ ...current, [requirementId]: result }));
    window.location.href = result.launchUrl;
  }

  return (
    <Card className="mb-5 border border-sky-200 bg-sky-50 p-5">
      <div className="kicker">EMSCodeSim drill</div>
      <h2 className="display mt-1 text-2xl font-bold">Assigned EMS training</h2>
      <p className="mt-1 text-sm text-navy-600">
        Complete the interactive drill in EMSCodeSim. Roadmap records completion after a secure callback. EMSCodeSim practice is training — Roadmap remains the assignment record.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {matches.map((req) => (
          <div key={req.id} className="rounded-lg border border-sky-200 bg-white p-4">
            <div className="font-semibold text-navy-900">{req.title}</div>
            <p className="mt-1 text-xs text-navy-500">
              EMSCodeSim Drill{launches[req.id]?.estimatedMinutes ? ` · Estimated time: ${launches[req.id].estimatedMinutes} minutes` : ""}
            </p>
            <button
              type="button"
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md bg-navy-900 px-4 py-2 text-sm font-bold text-white"
              onClick={() => startDrill(req.id)}
            >
              Start Drill
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
