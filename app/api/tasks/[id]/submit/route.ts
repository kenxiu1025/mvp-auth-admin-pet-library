import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getChildTodayPayload } from "@/lib/views";
import { TaskStateConflictError, submitTask } from "@/lib/tasks";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "child") {
    return NextResponse.json({ error: "只有小孩帳號可提交任務。" }, { status: 403 });
  }

  const { id } = await context.params;
  const taskId = Number(id);

  if (!Number.isInteger(taskId)) {
    return NextResponse.json({ error: "任務 ID 不正確。" }, { status: 400 });
  }

  try {
    submitTask(user.id, taskId);
    return NextResponse.json({
      ok: true,
      ...getChildTodayPayload(user.id),
    });
  } catch (error) {
    if (error instanceof TaskStateConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : "提交失敗。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
