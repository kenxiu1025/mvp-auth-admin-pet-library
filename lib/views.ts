import { getPetSnapshot } from "@/lib/pet";
import { getTasksForToday } from "@/lib/tasks";

export function getChildTodayPayload(userId: number) {
  return {
    pet: getPetSnapshot(userId),
    tasks: getTasksForToday(userId),
  };
}
