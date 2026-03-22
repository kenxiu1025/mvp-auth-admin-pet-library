"use client";

import { useEffect, useState, useTransition } from "react";
import { PetStatusPanel } from "@/components/PetStatusPanel";

type ChildPayload = {
  pet: {
    childName: string;
    petName: string;
    petAssetKey: string;
    petAssetName: string;
    todayFood: number;
    todayCoin: number;
    coinBalance: number;
    mood: "happy" | "calm" | "angry";
    petStatus: "hungry" | "normal";
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    foodThreshold: number;
    imagePath: string;
  };
  tasks: Array<{
    id: number;
    title: string;
    task_type: "main" | "side";
    status: "pending" | "submitted" | "approved" | "rejected";
    review_note: string | null;
  }>;
};

const statusLabel = {
  pending: "待完成",
  submitted: "等待家長審核",
  approved: "已確認✅",
  rejected: "需重做",
};

export function ChildDashboard({ initialData }: { initialData: ChildPayload }) {
  const [data, setData] = useState(initialData);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"ok" | "danger">("ok");
  const [submittingTaskId, setSubmittingTaskId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let timer: number | null = null;

    async function refreshChildData() {
      const response = await fetch("/api/child/today");
      const payload = await response.json();

      if (response.ok) {
        setData(payload);
      }
    }

    function stopPolling() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function startPolling() {
      if (timer !== null || document.hidden) {
        return;
      }

      timer = window.setInterval(() => {
        void refreshChildData();
      }, 8000);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopPolling();
        return;
      }

      void refreshChildData();
      startPolling();
    }

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function handleSubmit(taskId: number) {
    if (submittingTaskId !== null) {
      return;
    }

    startTransition(async () => {
      setSubmittingTaskId(taskId);
      const response = await fetch(`/api/tasks/${taskId}/submit`, {
        method: "PATCH",
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "提交失敗");
        setMessageTone("danger");
        setSubmittingTaskId(null);
        return;
      }

      setData({
        pet: payload.pet,
        tasks: payload.tasks,
      });
      setMessage("已提交，等待家長審核。");
      setMessageTone("ok");
      setSubmittingTaskId(null);
    });
  }

  return (
    <div className="grid">
      <PetStatusPanel pet={data.pet} />
      <section className="card">
        <h2 className="section-title">今日任務列表</h2>
        <p className="page-subtitle">每 8 秒會自動刷新一次，切到背景頁會暫停輪詢，回到前景再恢復。</p>
        {message ? <div className={`badge ${messageTone}`}>{message}</div> : null}
        <div className="item-list">
          {data.tasks.map((task) => (
            <div key={task.id} className="shop-item">
              <p className="task-title">{task.title}</p>
              <p className="task-meta">
                {task.task_type === "main" ? "貓糧任務" : "貓星幣任務"} / {statusLabel[task.status]}
              </p>
              {task.review_note ? <p className="task-meta">備註：{task.review_note}</p> : null}
              {task.status === "pending" ? (
                <button
                  type="button"
                  className="button primary"
                  disabled={isPending || submittingTaskId !== null}
                  onClick={() => handleSubmit(task.id)}
                >
                  {submittingTaskId === task.id ? "提交中..." : "我完成了"}
                </button>
              ) : (
                <div className={`badge ${task.status === "rejected" ? "danger" : "ok"}`}>{statusLabel[task.status]}</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
