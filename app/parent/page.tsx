import { ParentDailyProgress } from "@/components/ParentDailyProgress";
import { LogoutButton } from "@/components/LogoutButton";
import { OnboardingFunnelCard } from "@/components/OnboardingFunnelCard";
import { ParentAssignPanel } from "@/components/ParentAssignPanel";
import { ParentReviewQueue } from "@/components/ParentReviewQueue";
import { ParentInvitePanel } from "@/components/ParentInvitePanel";
import { requireRole } from "@/lib/auth";
import { getOnboardingFunnel } from "@/lib/analytics";
import { getTodayInHongKong } from "@/lib/date";
import { getParentDailyProgress } from "@/lib/parent-report";
import { TASK_TEMPLATES } from "@/lib/task-templates";
import { getReviewQueue } from "@/lib/tasks";

export default async function ParentPage() {
  const user = await requireRole("parent");

  return (
    <main className="grid">
      <section className="card hero-card">
        <div className="task-row">
          <div>
            <h1 className="page-title">家長控制台</h1>
            <p className="page-subtitle">在這裡派發任務，並審核孩子已提交的完成項目。</p>
          </div>
          <LogoutButton />
        </div>
      </section>
      <ParentInvitePanel />
      <OnboardingFunnelCard data={getOnboardingFunnel(7, user.id)} />
      <ParentAssignPanel templates={TASK_TEMPLATES} today={getTodayInHongKong()} />
      <ParentDailyProgress initialData={getParentDailyProgress(user.id, 7)} days={7} />
      <ParentReviewQueue initialQueue={getReviewQueue(user.id, "all")} />
    </main>
  );
}
