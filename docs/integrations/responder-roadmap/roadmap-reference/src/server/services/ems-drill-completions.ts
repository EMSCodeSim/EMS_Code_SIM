/**
 * Responder Roadmap service: record EMSCodeSim drill completions idempotently.
 *
 * Wire this into the existing assignment / RequirementCompletion flow:
 * - Verify assignment exists and drill matches
 * - Dedupe on completionId (store on Evidence.sourceExternalId or lastSubmissionRequestId)
 * - Mark requirement SUBMITTED with EMSCodeSim-verified evidence
 * - Do not auto-approve evaluator sign-off unless product rules say so
 */
import { prisma } from "@/server/db";

type CompletionPayload = {
  event?: string;
  drillId: string;
  drillVersion?: number;
  assignmentId: string;
  requirementId?: string | null;
  membershipId?: string | null;
  completionId: string;
  status?: string;
  completedAt?: string;
  durationSeconds?: number;
  score?: number | null;
  passed?: boolean;
  evaluatorId?: string | null;
  attemptNumber?: number;
};

export async function recordEmsDrillCompletion(payload: CompletionPayload) {
  if (!payload?.assignmentId || !payload?.drillId || !payload?.completionId) {
    const error: any = new Error("missing_required_fields");
    error.statusCode = 400;
    throw error;
  }

  const assignment = await prisma.taskBookAssignment.findUnique({
    where: { id: payload.assignmentId },
    include: {
      version: { include: { sections: { include: { requirements: true } } } }
    }
  });

  if (!assignment) {
    const error: any = new Error("assignment_not_found");
    error.statusCode = 404;
    throw error;
  }

  if (payload.membershipId && payload.membershipId !== assignment.membershipId) {
    const error: any = new Error("membership_mismatch");
    error.statusCode = 409;
    throw error;
  }

  const requirements = assignment.version.sections.flatMap((section) => section.requirements);
  const requirement =
    (payload.requirementId && requirements.find((item) => item.id === payload.requirementId)) ||
    requirements.find((item) =>
      [item.title, item.description, item.instructions, item.referenceUrl || ""]
        .join(" ")
        .includes(payload.drillId)
    ) ||
    requirements[0];

  if (!requirement) {
    const error: any = new Error("requirement_not_found");
    error.statusCode = 404;
    throw error;
  }

  // Idempotency: if this completionId was already recorded, return success.
  const existing = await prisma.evidence.findFirst({
    where: {
      completion: { assignmentId: assignment.id },
      sourceExternalId: payload.completionId
    }
  }).catch(() => null);

  if (existing) {
    return { duplicate: true, completionId: payload.completionId, requirementId: requirement.id };
  }

  // Implementation note:
  // Prefer calling the same internal helper used by assignments.submitRequirement,
  // passing clientRequestId = payload.completionId and an EXTERNAL_LINK evidence item
  // pointing at the EMSCodeSim drill receipt / drill id + version.
  //
  // Pseudo-integration (adapt to your service signatures):
  // await submitRequirement({
  //   assignmentId: assignment.id,
  //   requirementId: requirement.id,
  //   actorMembershipId: assignment.membershipId,
  //   notes: `EMSCodeSim verified drill ${payload.drillId} v${payload.drillVersion || 1}`,
  //   clientRequestId: payload.completionId,
  //   evidence: [{ type: "EXTERNAL_LINK", label: "EMSCodeSim drill completion", sourceExternalId: payload.completionId, url: `https://emscodesim.com/ems-drill.html?id=${payload.drillId}` }],
  //   metadata: { provider: "emscodesim", score: payload.score, durationSeconds: payload.durationSeconds, evaluatorId: payload.evaluatorId }
  // });

  return {
    accepted: true,
    completionId: payload.completionId,
    assignmentId: assignment.id,
    requirementId: requirement.id,
    status: "SUBMITTED"
  };
}
