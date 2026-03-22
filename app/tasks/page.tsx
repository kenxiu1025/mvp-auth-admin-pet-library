import { LogoutButton } from "@/components/LogoutButton";
import { ParentTaskOverview } from "@/components/ParentTaskOverview";
import { requireRole } from "@/lib/auth";
import { getTodayTasksForParent } from "@/lib/tasks";

export default async function TasksPage() {
  const user = await requireRole("parent");
  const tasks = getTodayTasksForParent(user.id, "all");

  return (
    <main className="grid">
      <section className="card hero-card">
        <div className="task-row">
          <div>
            <h1 className="page-title">家長任務視圖</h1>
            <p className="page-subtitle">查看今天派發出去的所有任務與目前狀態。</p>
          </div>
          <LogoutButton />
        </div>
      </section>
      <ParentTaskOverview tasks={tasks} />
    </main>
  );
}
