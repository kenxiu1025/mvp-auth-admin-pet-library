import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getParentDailyProgress } from "@/lib/parent-report";

export async function GET(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "parent") {
    return NextResponse.json({ error: "只有家長帳號可查看每日完成情況。" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rawDays = Number(searchParams.get("days") ?? "7");
  const days = Number.isInteger(rawDays) && rawDays > 0 && rawDays <= 30 ? rawDays : 7;

  return NextResponse.json(getParentDailyProgress(user.id, days));
}
