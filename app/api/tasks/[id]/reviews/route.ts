import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTaskOwner, getTaskReviews } from "@/lib/tasks";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "parent") {
    return NextResponse.json({ error: "只有家長帳號可查看審核日誌。" }, { status: 403 });
  }

  const { id } = await context.params;
  const taskId = Number(id);

  if (!Number.isInteger(taskId)) {
    return NextResponse.json({ error: "任務 ID 不正確。" }, { status: 400 });
  }

  const task = getTaskOwner(taskId);

  if (!task) {
    return NextResponse.json({ error: "找不到任務。" }, { status: 404 });
  }

  if (task.parent_user_id !== user.id) {
    return NextResponse.json({ error: "不可查看非本人名下孩子的審核日誌。" }, { status: 403 });
  }

  return NextResponse.json({
    reviews: getTaskReviews(taskId),
  });
}
