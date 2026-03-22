import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthPortal } from "@/components/AuthPortal";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  const inviteToken = typeof params.invite === "string" ? params.invite.trim() : "";
  const user = await getSessionUser();

  if (user && !inviteToken) {
    redirect(user.is_admin ? "/admin" : user.role === "parent" ? "/parent" : "/child");
  }

  return (
    <main className="grid">
      <section className="card hero-card">
        <h1 className="page-title">家庭任務系統</h1>
        <p className="page-subtitle">
          {inviteToken
            ? "這是一個孩子邀請連結，請依照步驟完成綁定。若目前瀏覽器已登入其他身份，完成後會切換為孩子帳號。"
            : "家長註冊後可建立邀請連結給孩子，孩子綁定角色後開始任務與進度追蹤。"}
        </p>
      </section>
      <AuthPortal />
    </main>
  );
}
