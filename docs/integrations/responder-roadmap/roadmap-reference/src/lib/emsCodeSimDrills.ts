import { createHmac, randomUUID, timingSafeEqual } from "crypto";

const ISSUER = "responderroadmap";
const AUDIENCE = "emscodesim";
const DEFAULT_TTL_SECONDS = 60 * 60 * 6;

function sharedSecret() {
  const secret = process.env.EMSCODESIM_ROADMAP_SHARED_SECRET || process.env.ROADMAP_EMSCODESIM_SHARED_SECRET;
  if (!secret) throw new Error("EMSCODESIM_ROADMAP_SHARED_SECRET is not configured");
  return secret;
}

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

export type EmsDrillLaunchClaims = {
  v: 1;
  iss: typeof ISSUER;
  aud: typeof AUDIENCE;
  drillId: string;
  drillVersion: number;
  assignmentId: string;
  requirementId?: string | null;
  membershipId?: string | null;
  departmentId?: string | null;
  returnUrl?: string | null;
  callbackUrl?: string | null;
  attemptNumber: number;
  iat: number;
  exp: number;
  jti: string;
};

export function createEmsDrillLaunchToken(input: {
  drillId: string;
  drillVersion?: number;
  assignmentId: string;
  requirementId?: string | null;
  membershipId?: string | null;
  departmentId?: string | null;
  returnUrl?: string | null;
  attemptNumber?: number;
  ttlSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://responderroadmap.com";
  const payload: EmsDrillLaunchClaims = {
    v: 1,
    iss: ISSUER,
    aud: AUDIENCE,
    drillId: input.drillId,
    drillVersion: input.drillVersion || 1,
    assignmentId: input.assignmentId,
    requirementId: input.requirementId || null,
    membershipId: input.membershipId || null,
    departmentId: input.departmentId || null,
    returnUrl: input.returnUrl || null,
    callbackUrl: `${appUrl.replace(/\/$/, "")}/api/v1/integrations/emscodesim/complete`,
    attemptNumber: input.attemptNumber || 1,
    iat: now,
    exp: now + (input.ttlSeconds || DEFAULT_TTL_SECONDS),
    jti: randomUUID()
  };
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(createHmac("sha256", sharedSecret()).update(body).digest());
  return {
    token: `${body}.${signature}`,
    payload,
    launchUrl: `https://emscodesim.com/ems-drill.html?id=${encodeURIComponent(input.drillId)}&token=${encodeURIComponent(`${body}.${signature}`)}`
  };
}

export function verifyEmsCodeSimSignature(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) return false;
  const expected = `sha256=${createHmac("sha256", sharedSecret()).update(rawBody).digest("hex")}`;
  const left = Buffer.from(signatureHeader);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function fetchEmsDrillCatalog() {
  const response = await fetch("https://emscodesim.com/.netlify/functions/ems-drill-catalog", {
    next: { revalidate: 300 }
  });
  if (!response.ok) throw new Error(`EMS drill catalog failed (${response.status})`);
  return response.json();
}

export function decodeLaunchTokenForDebug(token: string) {
  const [body] = token.split(".");
  return JSON.parse(fromBase64url(body).toString("utf8"));
}
