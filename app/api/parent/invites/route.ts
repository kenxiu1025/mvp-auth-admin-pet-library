import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createInvite } from "@/lib/onboarding";

export async function POST() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "parent") {
    return NextResponse.json({ error: "只有家長可產生邀請連結。" }, { status: 403 });
  }

  const invite = createInvite(user.id);

  return NextResponse.json({
    ok: true,
    token: invite.token,
    expiresAt: invite.expiresAt,
    inviteUrl: `/login?invite=${invite.token}`,
  });
}
