"use client";

import { useState, useTransition } from "react";

type Task = {
  id: number;
  title: string;
  task_type: "main" | "side";
  reward_value: number;
  completed: number;
};

type Props = {
  initialTasks: Task[];
};

export function TaskBoard({ initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<"main" | "side">("main");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function refreshTasks() {
    const response = await fetch("/api/tasks");
    const payload = await response.json();
    if (response.ok) {
      setTasks(payload.tasks);
    }
  }

  function handleToggle(taskId: number) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/tasks/${taskId}/toggle`, {
        method: "PATCH",
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "更新任務失敗");
        return;
      }

      setTasks(payload.tasks);
    });
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: String(formData.get("title") ?? ""),
          taskType: String(formData.get("taskType") ?? "main"),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "新增任務失敗");
        return;
      }

      setTitle("");
      setTaskType("main");
      setTasks(payload.tasks);
    });
  }

  const completedCount = tasks.filter((task) => task.completed === 1).length;

  return (
    <div className="grid two">
      <section className="card">
        <h2 className="section-title">新增今日任務</h2>
        <form className="form-row" onSubmit={handleCreate}>
          <input
            className="input"
            name="title"
            placeholder="例如：整理書包"
            value={title}
            maxLength={40}
            onChange={(event) => setTitle(event.target.value)}
          />
          <select
            className="select"
            name="taskType"
            value={taskType}
            onChange={(event) => setTaskType(event.target.value as "main" | "side")}
          >
            <option value="main">貓糧任務 +10 貓糧</option>
            <option value="side">貓星幣任務 +10 貓星幣</option>
          </select>
          <button type="submit" className="button primary" disabled={isPending}>
            {isPending ? "儲存中..." : "加入任務"}
          </button>
        </form>
        <p className="footer-note">每日上限 10 項。貓糧任務加貓糧，貓星幣任務加貓星幣。</p>
        {message ? <div className="badge danger">{message}</div> : null}
      </section>

      <section className="card">
        <h2 className="section-title">今日進度</h2>
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">任務總數</span>
            <span className="stat-value">{tasks.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">已完成</span>
            <span className="stat-value">{completedCount}</span>
          </div>
        </div>
        <p className="footer-note">勾選任務後，/pet 與 /shop 會即時反映最新狀態。</p>
        <div className="inline-actions">
          <button type="button" className="button secondary" onClick={refreshTasks} disabled={isPending}>
            重新整理
          </button>
        </div>
      </section>

      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <h2 className="section-title">今日任務清單</h2>
        {tasks.length === 0 ? (
          <div className="empty">今天還沒有任務，先新增幾項吧。</div>
        ) : (
          <div className="task-list">
            {tasks.map((task) => (
              <label key={task.id} className="task-item">
                <div className="task-row">
                  <div className="task-main">
                    <input
                      type="checkbox"
                      checked={task.completed === 1}
                      onChange={() => handleToggle(task.id)}
                      disabled={isPending}
                    />
                    <div>
                      <p className="task-title">{task.title}</p>
                      <div className="inline-actions">
                        <span className={`pill ${task.task_type}`}>
                          {task.task_type === "main" ? "貓糧任務 +10 貓糧" : "貓星幣任務 +10 貓星幣"}
                        </span>
                        {task.completed === 1 ? <span className="badge ok">已完成</span> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
