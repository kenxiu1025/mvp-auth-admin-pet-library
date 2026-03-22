import { ChildDashboard } from "@/components/ChildDashboard";
import { LogoutButton } from "@/components/LogoutButton";
import { requireRole } from "@/lib/auth";
import { getChildTodayPayload } from "@/lib/views";

export default async function ChildPage() {
  const user = await requireRole("child");
  const data = getChildTodayPayload(user.id);

  return (
    <main className="grid">
      <section className="card hero-card">
        <div className="task-row">
          <div>
            <h1 className="page-title">小孩端</h1>
            <p className="page-subtitle">只看寵物狀態與今天任務，完成後提交給家長審核。</p>
          </div>
          <LogoutButton />
        </div>
      </section>
      <ChildDashboard initialData={data} />
    </main>
  );
}
