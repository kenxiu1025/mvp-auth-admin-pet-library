import { NextResponse } from "next/server";
import { trackOnboardingEvent } from "@/lib/analytics";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.event_name !== "string" || !body.event_name.trim()) {
    return NextResponse.json({ error: "event_name is required" }, { status: 400 });
  }

  try {
    trackOnboardingEvent({
      event_name: body.event_name,
      invite_token: typeof body.invite_token === "string" ? body.invite_token : null,
      step: typeof body.step === "number" ? body.step : null,
      session_id: typeof body.session_id === "string" ? body.session_id : null,
      child_username: typeof body.child_username === "string" ? body.child_username : null,
      meta: body.meta && typeof body.meta === "object" ? body.meta : null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "analytics failed" },
      { status: 400 },
    );
  }
}
