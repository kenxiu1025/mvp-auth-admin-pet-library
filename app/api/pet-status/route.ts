import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPetSnapshot } from "@/lib/pet";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "child") {
    return NextResponse.json({ error: "只有小孩帳號可查看寵物狀態。" }, { status: 403 });
  }

  return NextResponse.json(getPetSnapshot(user.id));
}
