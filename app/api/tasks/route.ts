import { NextResponse } from "next/server";
import { getSessionUser, getUserByUsername } from "@/lib/auth";
import { createTask, getTasksForToday, getTodayTasksForParent } from "@/lib/tasks";
import type { TaskType } from "@/lib/types";

export async function GET(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role === "parent") {
    const { searchParams } = new URL(request.url);
    const child = searchParams.get("child");
    const normalizedChild = child && /^[a-zA-Z0-9_-]{3,32}$/.test(child) ? child : "all";
    return NextResponse.json({ tasks: getTodayTasksForParent(user.id, normalizedChild) });
  }

  return NextResponse.json({ tasks: getTasksForToday(user.id), user });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (sessionUser.role !== "parent") {
    return NextResponse.json({ error: "只有家長可建立任務。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const taskType = body?.taskType as TaskType | undefined;
  const username = typeof body?.username === "string" ? body.username : "";

  if (!title) {
    return NextResponse.json({ error: "請輸入任務名稱。" }, { status: 400 });
  }

  if (taskType !== "main" && taskType !== "side") {
    return NextResponse.json({ error: "任務類型不正確。" }, { status: 400 });
  }

  const targetUser = getUserByUsername(username);

  if (!targetUser || targetUser.role !== "child") {
    return NextResponse.json({ error: "請指定有效的小孩帳號。" }, { status: 400 });
  }

  if (targetUser.parent_user_id !== sessionUser.id) {
    return NextResponse.json({ error: "不可建立到非本人名下孩子。" }, { status: 403 });
  }

  try {
    const taskId = createTask(targetUser.id, title, taskType);
    const tasks = getTasksForToday(targetUser.id);
    return NextResponse.json({ ok: true, taskId, tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "建立任務失敗。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
