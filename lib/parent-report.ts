import { db } from "@/lib/db";
import { getRecentDatesInHongKong, getTodayInHongKong } from "@/lib/date";

type ChildUser = {
  id: number;
  username: string;
  display_name: string;
  pet_name: string | null;
};

type TaskStatusRow = {
  user_id: number;
  due_date: string;
  status: "pending" | "submitted" | "approved" | "rejected";
  count: number;
};

type SummaryRow = {
  user_id: number;
  summary_date: string;
  food_earned: number;
  coin_earned: number;
  completion_rate: number;
  mood: "happy" | "calm" | "angry";
  pet_status: "hungry" | "normal";
};

function getChildUsers(parentUserId: number) {
  return db
    .prepare(
      `
        SELECT users.id, users.username, users.display_name, pets.name AS pet_name
        FROM users
        LEFT JOIN pets ON pets.user_id = users.id
        WHERE users.role = 'child' AND users.parent_user_id = ?
        ORDER BY users.username ASC
      `,
    )
    .all(parentUserId) as ChildUser[];
}

export function getParentDailyProgress(parentUserId: number, days = 7) {
  const children = getChildUsers(parentUserId);
  const dates = getRecentDatesInHongKong(days);
  const today = getTodayInHongKong();

  if (children.length === 0) {
    return {
      today,
      todayOverview: [],
      history: [],
    };
  }

  const userIds = children.map((child) => child.id);
  const placeholders = userIds.map(() => "?").join(",");
  const datePlaceholders = dates.map(() => "?").join(",");

  const taskRows = db
    .prepare(
      `
        SELECT user_id, due_date, status, COUNT(*) AS count
        FROM tasks
        WHERE user_id IN (${placeholders})
          AND due_date IN (${datePlaceholders})
        GROUP BY user_id, due_date, status
      `,
    )
    .all(...userIds, ...dates) as TaskStatusRow[];

  const summaryRows = db
    .prepare(
      `
        SELECT user_id, summary_date, food_earned, coin_earned, completion_rate, mood, pet_status
        FROM daily_summary
        WHERE user_id IN (${placeholders})
          AND summary_date IN (${datePlaceholders})
      `,
    )
    .all(...userIds, ...dates) as SummaryRow[];

  const taskMap = new Map<string, number>();
  const summaryMap = new Map<string, SummaryRow>();

  for (const row of taskRows) {
    taskMap.set(`${row.user_id}:${row.due_date}:${row.status}`, row.count);
  }

  for (const row of summaryRows) {
    summaryMap.set(`${row.user_id}:${row.summary_date}`, row);
  }

  const history = children.flatMap((child) =>
    dates.map((date) => {
      const summary = summaryMap.get(`${child.id}:${date}`);
      return {
        username: child.username,
        displayName: child.display_name,
        petName: child.pet_name ?? "Cat",
        date,
        pending: taskMap.get(`${child.id}:${date}:pending`) ?? 0,
        submitted: taskMap.get(`${child.id}:${date}:submitted`) ?? 0,
        approved: taskMap.get(`${child.id}:${date}:approved`) ?? 0,
        rejected: taskMap.get(`${child.id}:${date}:rejected`) ?? 0,
        foodEarned: summary?.food_earned ?? 0,
        coinEarned: summary?.coin_earned ?? 0,
        completionRate: summary?.completion_rate ?? 0,
        mood: summary?.mood ?? "angry",
        petStatus: summary?.pet_status ?? "hungry",
      };
    }),
  );

  return {
    today,
    todayOverview: history.filter((row) => row.date === today),
    history,
  };
}
