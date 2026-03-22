import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTodayInHongKong } from "@/lib/date";
import { assignTasksToUsers } from "@/lib/tasks";
import type { TaskType } from "@/lib/types";

type RequestTask = {
  title: string;
  taskType: TaskType;
};

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "parent") {
    return NextResponse.json({ error: "只有家長帳號可派發任務。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const targetUsers: unknown[] = Array.isArray(body?.targetUsers) ? body.targetUsers : [];
  const tasks: unknown[] = Array.isArray(body?.tasks) ? body.tasks : [];
  const dueDate = typeof body?.dueDate === "string" && body.dueDate ? body.dueDate : getTodayInHongKong();

  const normalizedUsers = targetUsers
    .filter((name): name is string => typeof name === "string" && /^[a-zA-Z0-9_-]{3,32}$/.test(name))
    .map((name) => name.trim());

  const normalizedTasks = tasks
    .map((task: unknown): RequestTask | null => {
      if (
        typeof task === "object" &&
        task !== null &&
        "title" in task &&
        "taskType" in task &&
        typeof task.title === "string" &&
        task.title.trim() &&
        (task.taskType === "main" || task.taskType === "side")
      ) {
        return {
          title: task.title.trim(),
          taskType: task.taskType,
        };
      }

      return null;
    })
    .filter((task): task is RequestTask => task !== null);

  try {
    const result = assignTasksToUsers(user.id, normalizedUsers, normalizedTasks, dueDate);
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "派發任務失敗。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
