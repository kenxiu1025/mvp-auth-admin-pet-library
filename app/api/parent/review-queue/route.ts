import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getReviewQueue } from "@/lib/tasks";

export async function GET(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "parent") {
    return NextResponse.json({ error: "只有家長帳號可查看待審列表。" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const child = searchParams.get("child");
  const mode = searchParams.get("mode");
  const normalizedChild = child && /^[a-zA-Z0-9_-]{3,32}$/.test(child) ? child : "all";
  const normalizedMode =
    mode === "all" || mode === "submitted" || mode === "completed" ? mode : "submitted";

  return NextResponse.json({
    child: normalizedChild,
    mode: normalizedMode,
    queue: getReviewQueue(user.id, normalizedChild, normalizedMode),
  });
}
