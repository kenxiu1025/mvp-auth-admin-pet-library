"use client";

import { useEffect, useState, useTransition } from "react";

type DailyRow = {
  username: string;
  displayName: string;
  petName: string;
  date: string;
  pending: number;
  submitted: number;
  approved: number;
  rejected: number;
  foodEarned: number;
  coinEarned: number;
  completionRate: number;
  mood: "happy" | "calm" | "angry";
  petStatus: "hungry" | "normal";
};

type ParentDailyProgressPayload = {
  today: string;
  todayOverview: DailyRow[];
  history: DailyRow[];
};

export function ParentDailyProgress({
  initialData,
  days,
}: {
  initialData: ParentDailyProgressPayload;
  days: number;
}) {
  const [data, setData] = useState(initialData);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadProgress(silent = false) {
    const response = await fetch(`/api/parent/daily-progress?days=${days}`);
    const payload = await response.json();

    if (!response.ok) {
      if (!silent) {
        setMessage(payload.error ?? "讀取每日完成情況失敗");
      }
      return;
    }

    setData(payload);
    if (!silent) {
      setMessage("已更新每日完成情況。");
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadProgress(true);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [days]);

  const children = Array.from(new Set(data.history.map((row) => row.username)));

  return (
    <section className="card">
      <div className="task-row">
        <div>
          <h2 className="section-title">每日完成總覽</h2>
          <p className="page-subtitle">今天的任務狀態會自動刷新，每 8 秒同步一次。</p>
        </div>
        <button
          type="button"
          className="button secondary"
          disabled={isPending}
          onClick={() => startTransition(async () => loadProgress(false))}
        >
          重新整理
        </button>
      </div>
      {message ? <div className="badge ok">{message}</div> : null}

      <div className="grid two">
        {data.todayOverview.map((row) => (
          <div key={row.username} className="shop-item">
            <p className="task-title">
              {row.displayName} / {row.petName}
            </p>
            <div className="stat-row">
              <div className="stat">
                <span className="stat-label">待完成</span>
                <span className="stat-value">{row.pending}</span>
              </div>
              <div className="stat">
                <span className="stat-label">待審核</span>
                <span className="stat-value">{row.submitted}</span>
              </div>
              <div className="stat">
                <span className="stat-label">已批准</span>
                <span className="stat-value">{row.approved}</span>
              </div>
              <div className="stat">
                <span className="stat-label">已退回</span>
                <span className="stat-value">{row.rejected}</span>
              </div>
            </div>
            <p className="task-meta">
              今日貓糧 {row.foodEarned} / 今日貓星幣 {row.coinEarned} / 完成率 {Math.round(row.completionRate * 100)}%
            </p>
          </div>
        ))}
      </div>

      <div className="item-list" style={{ marginTop: "12px" }}>
        {children.map((username) => {
          const rows = data.history.filter((row) => row.username === username);
          return (
            <div key={username} className="inventory-item">
              <p className="task-title">{rows[0]?.displayName} 最近 {days} 天</p>
              <div className="history-table">
                <div className="history-header">日期</div>
                <div className="history-header">批准</div>
                <div className="history-header">待審</div>
                <div className="history-header">退回</div>
                <div className="history-header">貓糧</div>
                <div className="history-header">貓星幣</div>
                {rows.map((row) => (
                  <div key={`${row.username}-${row.date}`} className="history-row">
                    <span>{row.date}</span>
                    <span>{row.approved}</span>
                    <span>{row.submitted}</span>
                    <span>{row.rejected}</span>
                    <span>{row.foodEarned}</span>
                    <span>{row.coinEarned}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
