import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { TaskStateConflictError, getReviewQueue, reviewTask } from "@/lib/tasks";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "parent") {
    return NextResponse.json({ error: "只有家長帳號可審核任務。" }, { status: 403 });
  }

  const { id } = await context.params;
  const taskId = Number(id);
  const body = await request.json().catch(() => null);
  const action = body?.action;
  const note = typeof body?.note === "string" ? body.note : "";

  if (!Number.isInteger(taskId)) {
    return NextResponse.json({ error: "任務 ID 不正確。" }, { status: 400 });
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "審核動作不正確。" }, { status: 400 });
  }

  try {
    reviewTask(user.id, taskId, action, note);
    return NextResponse.json({
      ok: true,
      queue: getReviewQueue(user.id, "all", "submitted"),
    });
  } catch (error) {
    if (error instanceof TaskStateConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : "審核失敗。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
