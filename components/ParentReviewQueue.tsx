"use client";

import { useEffect, useState, useTransition } from "react";
import { TaskReviewHistoryDrawer } from "@/components/TaskReviewHistoryDrawer";

type ReviewTask = {
  id: number;
  title: string;
  task_type: "main" | "side";
  username: string;
  display_name: string;
  status: "pending" | "submitted" | "approved" | "rejected";
  submitted_at: string | null;
  review_note: string | null;
};

type ChildOption = { id: number; username: string; display_name: string };

export function ParentReviewQueue({ initialQueue }: { initialQueue: ReviewTask[] }) {
  const [queue, setQueue] = useState(initialQueue);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [childFilter, setChildFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<"all" | "submitted" | "completed">("submitted");
  const [noteById, setNoteById] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"ok" | "danger">("ok");
  const [lockedTaskId, setLockedTaskId] = useState<number | null>(null);
  const [historyTask, setHistoryTask] = useState<{ id: number; title: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/parent/children");
      const payload = await response.json();
      if (response.ok) {
        setChildren(payload.children ?? []);
      }
      setChildrenLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (childFilter === "all") {
      return;
    }

    if (!children.some((child) => child.username === childFilter)) {
      setChildFilter("all");
      void (async () => {
        const response = await fetch(`/api/parent/review-queue?child=all&mode=${modeFilter}`);
        const payload = await response.json();

        if (response.ok) {
          setQueue(payload.queue ?? []);
        }
      })();
    }
  }, [children, childFilter, modeFilter]);

  function loadQueue(filter: string, mode = modeFilter) {
    startTransition(async () => {
      setChildFilter(filter);
      setModeFilter(mode);
      const response = await fetch(`/api/parent/review-queue?child=${encodeURIComponent(filter)}&mode=${mode}`);
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "讀取任務列表失敗");
        setMessageTone("danger");
        return;
      }

      setQueue(payload.queue ?? []);
      setMessage("");
    });
  }

  function handleReview(taskId: number, action: "approve" | "reject") {
    if (lockedTaskId !== null) {
      return;
    }

    startTransition(async () => {
      setLockedTaskId(taskId);
      const response = await fetch(`/api/tasks/${taskId}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          note: noteById[taskId] ?? "",
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "審核失敗");
        setMessageTone("danger");
        setLockedTaskId(null);
        return;
      }

      const filterResponse = await fetch(`/api/parent/review-queue?child=${encodeURIComponent(childFilter)}&mode=${modeFilter}`);
      const filterPayload = await filterResponse.json();
      setQueue(filterPayload.queue ?? payload.queue ?? []);
      setMessage(action === "approve" ? "已批准任務。" : "已退回任務。");
      setMessageTone("ok");
      setLockedTaskId(null);
    });
  }

  return (
    <section className="card">
      <h2 className="section-title">家長快速篩選</h2>
      {!childrenLoaded ? <div className="badge">載入你名下的孩子篩選中...</div> : null}
      {childrenLoaded ? (
        children.length === 0 ? (
          <div className="badge danger">你目前還沒有名下孩子，因此待審列表不會出現孩子篩選。</div>
        ) : (
          <div className="inline-actions">
            <button type="button" className="button secondary" onClick={() => loadQueue("all")} disabled={isPending}>
              全部孩子
            </button>
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                className="button secondary"
                onClick={() => loadQueue(child.username)}
                disabled={isPending}
              >
                {child.display_name}
              </button>
            ))}
          </div>
        )
      ) : null}
      <div className="inline-actions">
        <button type="button" className="button secondary" onClick={() => loadQueue(childFilter, "all")} disabled={isPending}>
          全部
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => loadQueue(childFilter, "submitted")}
          disabled={isPending}
        >
          待審核
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => loadQueue(childFilter, "completed")}
          disabled={isPending}
        >
          已完成
        </button>
      </div>
      {message ? <div className={`badge ${messageTone}`}>{message}</div> : null}
      {queue.length === 0 ? (
        <div className="empty">目前這個篩選條件下沒有任務。</div>
      ) : (
        <div className="item-list" style={{ marginTop: "12px" }}>
          {queue.map((task) => (
            <div key={task.id} className="shop-item">
              <p className="task-title">
                {task.display_name} / {task.title}
              </p>
              <p className="task-meta">
                {task.task_type === "main" ? "貓糧任務" : "貓星幣任務"} / {task.status}
                {task.submitted_at ? `，提交時間 ${new Date(task.submitted_at).toLocaleString("zh-HK")}` : ""}
              </p>
              {task.review_note ? <p className="task-meta">最近備註：{task.review_note}</p> : null}
              <div className="inline-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setHistoryTask({ id: task.id, title: `${task.display_name} / ${task.title}` })}
                >
                  審核歷史
                </button>
              </div>
              {task.status === "submitted" ? (
                <>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="可選填審核備註"
                    value={noteById[task.id] ?? ""}
                    onChange={(event) => setNoteById((current) => ({ ...current, [task.id]: event.target.value }))}
                  />
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="button primary"
                      disabled={isPending || lockedTaskId !== null}
                      onClick={() => handleReview(task.id, "approve")}
                    >
                      {lockedTaskId === task.id ? "處理中..." : "批准"}
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={isPending || lockedTaskId !== null}
                      onClick={() => handleReview(task.id, "reject")}
                    >
                      {lockedTaskId === task.id ? "處理中..." : "退回"}
                    </button>
                  </div>
                </>
              ) : (
                <div className={`badge ${task.status === "rejected" ? "danger" : "ok"}`}>
                  {task.status === "approved" ? "已完成" : task.status === "rejected" ? "已退回" : task.status}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {historyTask ? (
        <TaskReviewHistoryDrawer
          taskId={historyTask.id}
          taskTitle={historyTask.title}
          onClose={() => setHistoryTask(null)}
        />
      ) : null}
    </section>
  );
}
