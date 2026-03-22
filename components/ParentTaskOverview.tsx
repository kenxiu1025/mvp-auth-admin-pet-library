type ParentTask = {
  id: number;
  title: string;
  task_type: "main" | "side";
  status: "pending" | "submitted" | "approved" | "rejected";
  username: string;
  display_name: string;
  review_note: string | null;
};

const statusLabel = {
  pending: "待完成",
  submitted: "待審核",
  approved: "已批准",
  rejected: "已退回",
};

export function ParentTaskOverview({ tasks }: { tasks: ParentTask[] }) {
  return (
    <section className="card">
      <h2 className="section-title">今日任務總覽</h2>
      {tasks.length === 0 ? (
        <div className="empty">今天還沒有任務。</div>
      ) : (
        <div className="item-list">
          {tasks.map((task) => (
            <div key={task.id} className="inventory-item">
              {task.display_name} / {task.title} / {task.task_type === "main" ? "貓糧任務" : "貓星幣任務"} /{" "}
              {statusLabel[task.status]}
              {task.review_note ? ` / 備註：${task.review_note}` : ""}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
