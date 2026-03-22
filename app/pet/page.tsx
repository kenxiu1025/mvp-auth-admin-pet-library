import { LogoutButton } from "@/components/LogoutButton";
import { PetStatusPanel } from "@/components/PetStatusPanel";
import { requireRole } from "@/lib/auth";
import { getPetSnapshot } from "@/lib/pet";

export default async function PetPage() {
  const user = await requireRole("child");
  const pet = getPetSnapshot(user.id);

  return (
    <main className="grid">
      <section className="card hero-card">
        <div className="task-row">
          <div>
            <h1 className="page-title">貓咪狀態</h1>
            <p className="page-subtitle">小孩端可查看今天的貓糧、貓星幣、狀態與情緒。</p>
          </div>
          <LogoutButton />
        </div>
      </section>
      <PetStatusPanel pet={pet} />
    </main>
  );
}
