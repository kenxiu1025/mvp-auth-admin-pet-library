import { AdminConsole } from "@/components/AdminConsole";
import { LogoutButton } from "@/components/LogoutButton";
import { getAdminOverview } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="grid">
      <section className="card hero-card">
        <div className="task-row">
          <div>
            <h1 className="page-title">管理員後台</h1>
            <p className="page-subtitle">查看家長與孩子的歸屬關係，並協助處理帳號支援。</p>
          </div>
          <LogoutButton />
        </div>
      </section>
      <AdminConsole initialData={getAdminOverview()} />
    </main>
  );
}
