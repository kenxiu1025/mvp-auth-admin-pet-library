import type { TaskType } from "@/lib/types";

export const TASK_TEMPLATES: Array<{ title: string; taskType: TaskType }> = [
  { title: "學校作業", taskType: "main" },
  { title: "中文閱讀", taskType: "main" },
  { title: "英文閱讀", taskType: "main" },
  { title: "數學練習", taskType: "main" },
  { title: "彈琴", taskType: "side" },
  { title: "空手道", taskType: "side" },
  { title: "圍棋", taskType: "side" },
  { title: "netball", taskType: "side" },
];
