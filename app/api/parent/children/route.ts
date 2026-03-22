import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listChildrenForParent } from "@/lib/onboarding";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "parent") {
    return NextResponse.json({ error: "只有家長可查看孩子名單。" }, { status: 403 });
  }

  return NextResponse.json({ children: listChildrenForParent(user.id) });
}
