import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOnboardingFunnel } from "@/lib/analytics";

export async function GET(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "parent") {
    return NextResponse.json({ error: "只有家長帳號可查看 onboarding 漏斗。" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rawDays = Number(searchParams.get("days") ?? "7");
  const days = Number.isInteger(rawDays) && rawDays >= 1 && rawDays <= 30 ? rawDays : 7;

  return NextResponse.json(getOnboardingFunnel(days, user.id));
}
