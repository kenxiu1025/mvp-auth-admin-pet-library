"use client";

import { useEffect, useState } from "react";

type ReviewLog = {
  id: number;
  task_id: number;
  from_status: string;
  to_status: string;
  note: string | null;
  created_at: string;
  actor_username: string;
  actor_display_name: string;
};

export function TaskReviewHistoryDrawer({
  taskId,
  taskTitle,
  onClose,
}: {
  taskId: number;
  taskTitle: string;
  onClose: () => void;
}) {
  const [reviews, setReviews] = useState<ReviewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReviews() {
    setLoading(true);
    setError("");

    const response = await fetch(`/api/tasks/${taskId}/reviews`);
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "讀取審核歷史失敗");
      setLoading(false);
      return;
    }

    setReviews(payload.reviews ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadReviews();
  }, [taskId]);

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="審核歷史"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="task-row">
          <div>
            <h2 className="section-title">審核歷史</h2>
            <p className="page-subtitle">{taskTitle}</p>
          </div>
          <button type="button" className="button secondary" onClick={onClose}>
            關閉
          </button>
        </div>

        <div className="inline-actions">
          <button type="button" className="button secondary" onClick={() => void loadReviews()} disabled={loading}>
            {loading ? "讀取中..." : "重新整理"}
          </button>
        </div>

        {loading ? <div className="empty">讀取中...</div> : null}

        {!loading && error ? (
          <div className="grid">
            <div className="badge danger">{error}</div>
            <button type="button" className="button secondary" onClick={() => void loadReviews()}>
              重試
            </button>
          </div>
        ) : null}

        {!loading && !error && reviews.length === 0 ? <div className="empty">尚無審核紀錄</div> : null}

        {!loading && !error && reviews.length > 0 ? (
          <div className="item-list">
            {reviews.map((review) => (
              <div key={review.id} className="inventory-item">
                <p className="task-title">
                  {review.actor_display_name} ({review.actor_username})
                </p>
                <p className="task-meta">動作：{review.to_status}</p>
                <p className="task-meta">
                  狀態變更：{review.from_status} -&gt; {review.to_status}
                </p>
                <p className="task-meta">
                  時間：{new Date(review.created_at).toLocaleString("zh-HK")}
                </p>
                <p className="task-meta">備註：{review.note || "無"}</p>
              </div>
            ))}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
