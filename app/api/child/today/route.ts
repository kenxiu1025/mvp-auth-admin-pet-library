import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getChildTodayPayload } from "@/lib/views";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "child") {
    return NextResponse.json({ error: "只有小孩帳號可查看小孩端。" }, { status: 403 });
  }

  return NextResponse.json(getChildTodayPayload(user.id));
}
