import { db } from "@/lib/db";
import { getTodayInHongKong } from "@/lib/date";
import { refreshDailySummary } from "@/lib/pet";
import type { TaskStatus, TaskType } from "@/lib/types";

type AssignTaskInput = {
  title: string;
  taskType: TaskType;
};

export type TaskRecord = {
  id: number;
  title: string;
  task_type: TaskType;
  reward_value: number;
  due_date: string;
  created_at: string;
  status: TaskStatus;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: number | null;
  review_note: string | null;
};

export class TaskStateConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskStateConflictError";
  }
}

export function getTasksForToday(userId: number) {
  return getTasksForDate(userId, getTodayInHongKong());
}

export function getTasksForDate(userId: number, dueDate = getTodayInHongKong()) {
  return db
    .prepare(
      `
        SELECT
          id,
          title,
          task_type,
          reward_value,
          due_date,
          created_at,
          status,
          submitted_at,
          approved_at,
          approved_by,
          review_note
        FROM tasks
        WHERE user_id = ? AND due_date = ?
        ORDER BY created_at ASC, id ASC
      `,
    )
    .all(userId, dueDate) as TaskRecord[];
}

export function createTask(userId: number, title: string, taskType: TaskType) {
  return createTaskForDate(userId, title, taskType, getTodayInHongKong());
}

export function createTaskForDate(userId: number, title: string, taskType: TaskType, dueDate: string) {
  const taskCountRow = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM tasks
        WHERE user_id = ? AND due_date = ?
      `,
    )
    .get(userId, dueDate) as { count: number };

  if (taskCountRow.count >= 10) {
    throw new Error("當日最多只能建立 10 項任務。");
  }

  const result = db
    .prepare(
      `
        INSERT INTO tasks (user_id, title, task_type, reward_value, due_date, created_at, status)
        VALUES (?, ?, ?, 10, ?, ?, 'pending')
      `,
    )
    .run(userId, title, taskType, dueDate, new Date().toISOString());

  refreshDailySummary(userId, dueDate);
  return result.lastInsertRowid;
}

export function assignTasksToUsers(
  parentUserId: number,
  usernames: string[],
  tasks: AssignTaskInput[],
  dueDate = getTodayInHongKong(),
) {
  if (usernames.length === 0) {
    throw new Error("請至少選擇一位孩子。");
  }

  if (tasks.length === 0) {
    throw new Error("請至少選擇一個任務模板。");
  }

  const users = db
    .prepare(
      `
        SELECT id, username, display_name, role, parent_user_id
        FROM users
        WHERE username IN (${usernames.map(() => "?").join(",")})
      `,
    )
    .all(...usernames) as Array<{ id: number; username: string; display_name: string; role: string; parent_user_id: number | null }>;

  if (users.length !== usernames.length) {
    throw new Error("部分孩子帳號不存在。");
  }

  if (users.some((user) => user.role !== "child")) {
    throw new Error("只能派發任務給孩子帳號。");
  }

  if (users.some((user) => user.parent_user_id !== parentUserId)) {
    throw new Error("不可派發到非本人名下的孩子。");
  }

  const insertTask = db.prepare(
    `
      INSERT INTO tasks (user_id, title, task_type, reward_value, due_date, created_at, status)
      VALUES (?, ?, ?, 10, ?, ?, 'pending')
    `,
  );

  const countTasks = db.prepare(
    `
      SELECT COUNT(*) AS count
      FROM tasks
      WHERE user_id = ? AND due_date = ?
    `,
  );

  const findExisting = db.prepare(
    `
      SELECT id
      FROM tasks
      WHERE user_id = ? AND due_date = ? AND title = ? AND task_type = ?
    `,
  );

  const results = [];

  for (const user of users) {
    const existingCount = (countTasks.get(user.id, dueDate) as { count: number }).count;
    let remainingSlots = Math.max(0, 10 - existingCount);
    let assigned = 0;
    let skippedDuplicates = 0;
    let skippedLimit = 0;

    for (const task of tasks) {
      const duplicate = findExisting.get(user.id, dueDate, task.title, task.taskType) as { id: number } | undefined;

      if (duplicate) {
        skippedDuplicates += 1;
        continue;
      }

      if (remainingSlots <= 0) {
        skippedLimit += 1;
        continue;
      }

      insertTask.run(user.id, task.title, task.taskType, dueDate, new Date().toISOString());
      assigned += 1;
      remainingSlots -= 1;
    }

    refreshDailySummary(user.id, dueDate);
    results.push({
      username: user.username,
      displayName: user.display_name,
      assigned,
      skippedDuplicates,
      skippedLimit,
      finalTaskCount: existingCount + assigned,
    });
  }

  return {
    dueDate,
    results,
  };
}

export function getTodayTasksForParent(parentUserId: number, child: string | "all" = "all") {
  const today = getTodayInHongKong();
  const params: Array<string | number> = [today, parentUserId];
  const childFilter = child === "all" ? "" : "AND users.username = ?";

  if (child !== "all") {
    params.push(child);
  }

  return db
    .prepare(
      `
        SELECT
          tasks.id,
          tasks.title,
          tasks.task_type,
          tasks.reward_value,
          tasks.status,
          tasks.review_note,
          tasks.submitted_at,
          tasks.approved_at,
          tasks.approved_by,
          tasks.due_date,
          tasks.created_at,
          users.username,
          users.display_name
        FROM tasks
        INNER JOIN users ON users.id = tasks.user_id
        WHERE tasks.due_date = ?
          AND users.parent_user_id = ?
          ${childFilter}
        ORDER BY users.username ASC, tasks.created_at ASC, tasks.id ASC
      `,
    )
    .all(...params) as Array<
    TaskRecord & {
      username: string;
      display_name: string;
    }
  >;
}

export function getReviewQueue(
  parentUserId: number,
  child: string | "all" = "all",
  mode: "all" | "submitted" | "completed" = "submitted",
) {
  const tasks = getTodayTasksForParent(parentUserId, child);

  if (mode === "all") {
    return tasks;
  }

  if (mode === "completed") {
    return tasks.filter((task) => task.status === "approved" || task.status === "rejected");
  }

  return tasks.filter((task) => task.status === "submitted");
}

export function submitTask(childUserId: number, taskId: number) {
  const task = db
    .prepare(
      `
        SELECT id, user_id, due_date, status
        FROM tasks
        WHERE id = ?
      `,
    )
    .get(taskId) as
    | {
        id: number;
        user_id: number;
        due_date: string;
        status: TaskStatus;
      }
    | undefined;

  if (!task || task.user_id !== childUserId) {
    throw new Error("找不到可提交的任務。");
  }

  const result = db.prepare(
    `
      UPDATE tasks
      SET status = 'submitted', submitted_at = ?, review_note = NULL
      WHERE id = ? AND status = 'pending'
    `,
  ).run(new Date().toISOString(), taskId);

  if (result.changes === 0) {
    throw new TaskStateConflictError("任務狀態已變更，請刷新");
  }

  refreshDailySummary(childUserId, task.due_date);
}

export function reviewTask(
  parentUserId: number,
  taskId: number,
  action: "approve" | "reject",
  note?: string,
) {
  const task = db
    .prepare(
      `
        SELECT tasks.id, tasks.user_id, tasks.due_date, tasks.status, users.parent_user_id
        FROM tasks
        INNER JOIN users ON users.id = tasks.user_id
        WHERE tasks.id = ?
      `,
    )
    .get(taskId) as
    | {
        id: number;
        user_id: number;
        due_date: string;
        status: TaskStatus;
        parent_user_id: number | null;
      }
    | undefined;

  if (!task) {
    throw new Error("找不到任務。");
  }

  if (task.parent_user_id !== parentUserId) {
    throw new Error("不可審核非本人名下的孩子任務。");
  }

  const nextStatus: TaskStatus = action === "approve" ? "approved" : "rejected";
  const trimmedNote = note?.trim() ? note.trim() : null;

  const transaction = db.transaction(() => {
    const result = db.prepare(
      `
        UPDATE tasks
        SET
          status = ?,
          approved_at = ?,
          approved_by = ?,
          review_note = ?
        WHERE id = ? AND status = 'submitted'
      `,
    ).run(
      nextStatus,
      action === "approve" ? new Date().toISOString() : null,
      parentUserId,
      trimmedNote,
      taskId,
    );

    if (result.changes === 0) {
      throw new TaskStateConflictError("任務狀態已變更，請刷新");
    }

    db.prepare(
      `
        INSERT INTO task_reviews (task_id, actor_user_id, from_status, to_status, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    ).run(taskId, parentUserId, task.status, nextStatus, trimmedNote, new Date().toISOString());
  });

  transaction();
  refreshDailySummary(task.user_id, task.due_date);
}

export function getTaskReviews(taskId: number) {
  return db
    .prepare(
      `
        SELECT
          task_reviews.id,
          task_reviews.task_id,
          task_reviews.from_status,
          task_reviews.to_status,
          task_reviews.note,
          task_reviews.created_at,
          users.username AS actor_username,
          users.display_name AS actor_display_name
        FROM task_reviews
        INNER JOIN users ON users.id = task_reviews.actor_user_id
        WHERE task_reviews.task_id = ?
        ORDER BY task_reviews.created_at DESC, task_reviews.id DESC
      `,
    )
    .all(taskId) as Array<{
    id: number;
    task_id: number;
    from_status: TaskStatus;
    to_status: TaskStatus;
    note: string | null;
    created_at: string;
    actor_username: string;
    actor_display_name: string;
  }>;
}

export function getTaskOwner(taskId: number) {
  return db
    .prepare(
      `
        SELECT tasks.id, tasks.user_id, users.parent_user_id
        FROM tasks
        INNER JOIN users ON users.id = tasks.user_id
        WHERE tasks.id = ?
      `,
    )
    .get(taskId) as
    | {
        id: number;
        user_id: number;
        parent_user_id: number | null;
      }
    | undefined;
}
