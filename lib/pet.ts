import { db } from "@/lib/db";
import { getDailyFoodThreshold } from "@/lib/config";
import { getTodayInHongKong } from "@/lib/date";
import { getPetAssetById, getPetImagePath } from "@/lib/pet-assets";
import type { Mood, PetStatus } from "@/lib/types";

type TaskRow = {
  id: number;
  task_type: "main" | "side";
  status: "pending" | "submitted" | "approved" | "rejected";
};

export function calculateMoodAndStatus(food: number, completionRate: number, foodThreshold = getDailyFoodThreshold()): {
  mood: Mood;
  petStatus: PetStatus;
} {
  if (food < foodThreshold) {
    return {
      mood: "angry",
      petStatus: "hungry",
    };
  }

  if (completionRate >= 0.8) {
    return {
      mood: "happy",
      petStatus: "normal",
    };
  }

  if (completionRate >= 0.5) {
    return {
      mood: "calm",
      petStatus: "normal",
    };
  }

  return {
    mood: "angry",
    petStatus: "normal",
  };
}

export function refreshDailySummary(userId: number, summaryDate = getTodayInHongKong()) {
  const tasks = db
    .prepare(
      `
        SELECT id, task_type, status
        FROM tasks
        WHERE user_id = ? AND due_date = ?
      `,
    )
    .all(userId, summaryDate) as TaskRow[];

  const completedMain = tasks.filter((task) => task.task_type === "main" && task.status === "approved").length;
  const completedSide = tasks.filter((task) => task.task_type === "side" && task.status === "approved").length;
  const totalTasks = tasks.length;
  const completedTasks = completedMain + completedSide;
  const foodEarned = completedMain * 10;
  const coinEarned = completedSide * 10;
  const completionRate = totalTasks === 0 ? 0 : Number((completedTasks / totalTasks).toFixed(2));
  const foodThreshold = getDailyFoodThreshold();
  const { mood, petStatus } = calculateMoodAndStatus(foodEarned, completionRate, foodThreshold);
  const updatedAt = new Date().toISOString();

  db.prepare(
    `
      INSERT INTO daily_summary (
        user_id, summary_date, food_earned, coin_earned, completed_main, completed_side,
        total_tasks, completion_rate, mood, pet_status, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, summary_date) DO UPDATE SET
        food_earned = excluded.food_earned,
        coin_earned = excluded.coin_earned,
        completed_main = excluded.completed_main,
        completed_side = excluded.completed_side,
        total_tasks = excluded.total_tasks,
        completion_rate = excluded.completion_rate,
        mood = excluded.mood,
        pet_status = excluded.pet_status,
        updated_at = excluded.updated_at
    `,
  ).run(
    userId,
    summaryDate,
    foodEarned,
    coinEarned,
    completedMain,
    completedSide,
    totalTasks,
    completionRate,
    mood,
    petStatus,
    updatedAt,
  );

  return {
    summaryDate,
    foodEarned,
    coinEarned,
    completedMain,
    completedSide,
    totalTasks,
    completedTasks,
    completionRate,
    mood,
    petStatus,
    foodThreshold,
  };
}

export function getCoinBalance(userId: number) {
  const earned = db
    .prepare(
      `
        SELECT COALESCE(SUM(coin_earned), 0) AS total
        FROM daily_summary
        WHERE user_id = ?
      `,
    )
    .get(userId) as { total: number };

  const spent = db
    .prepare(
      `
        SELECT COALESCE(SUM(shop_items.price), 0) AS total
        FROM inventory
        INNER JOIN shop_items ON shop_items.id = inventory.shop_item_id
        WHERE inventory.user_id = ?
      `,
    )
    .get(userId) as { total: number };

  return earned.total - spent.total;
}

export function getPetSnapshot(userId: number) {
  const today = getTodayInHongKong();
  const summary = refreshDailySummary(userId, today);
  const pet = db
    .prepare(
      `
        SELECT pets.name, users.display_name
             , pets.selected_pet_asset_id
        FROM pets
        INNER JOIN users ON users.id = pets.user_id
        WHERE pets.user_id = ?
      `,
    )
    .get(userId) as { name: string; display_name: string; selected_pet_asset_id: number | null } | undefined;
  const petAsset = getPetAssetById(pet?.selected_pet_asset_id ?? null);

  return {
    date: today,
    childName: pet?.display_name ?? "",
    petName: pet?.name ?? "Cat",
    todayFood: summary.foodEarned,
    todayCoin: summary.coinEarned,
    completionRate: summary.completionRate,
    mood: summary.mood,
    petStatus: summary.petStatus,
    coinBalance: getCoinBalance(userId),
    totalTasks: summary.totalTasks,
    completedTasks: summary.completedTasks,
    foodThreshold: summary.foodThreshold,
    petAssetKey: petAsset?.key ?? "cat-default",
    petAssetName: petAsset?.name ?? "預設貓咪",
    imagePath: getPetImagePath(summary.petStatus, summary.mood, pet?.selected_pet_asset_id),
  };
}
