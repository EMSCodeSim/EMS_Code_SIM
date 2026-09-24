import { NextRequest, NextResponse } from "next/server";
import { verifyEmsCodeSimSignature } from "@/lib/emsCodeSimDrills";
import { recordEmsDrillCompletion } from "@/server/services/ems-drill-completions";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-emscodesim-signature");

  if (!verifyEmsCodeSimSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await recordEmsDrillCompletion(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    const status = Number(error?.statusCode || 400);
    return NextResponse.json({ ok: false, error: error?.message || "completion_rejected" }, { status });
  }
}
