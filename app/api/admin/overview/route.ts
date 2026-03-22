import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAdminOverview } from "@/lib/admin";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (!user.is_admin) {
    return NextResponse.json({ error: "只有管理員可查看此頁。" }, { status: 403 });
  }

  return NextResponse.json(getAdminOverview());
}
