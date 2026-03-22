import { db } from "@/lib/db";

export const DEFAULT_DAILY_FOOD_THRESHOLD = 30;
export const DAILY_FOOD_THRESHOLD_KEY = "DAILY_FOOD_THRESHOLD";

export function getConfigValue(key: string) {
  const row = db
    .prepare(
      `
        SELECT value
        FROM app_config
        WHERE key = ?
      `,
    )
    .get(key) as { value: string } | undefined;

  return row?.value ?? null;
}

export function getDailyFoodThreshold() {
  const rawValue = getConfigValue(DAILY_FOOD_THRESHOLD_KEY);
  const parsed = rawValue ? Number(rawValue) : NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DAILY_FOOD_THRESHOLD;
  }

  return parsed;
}
