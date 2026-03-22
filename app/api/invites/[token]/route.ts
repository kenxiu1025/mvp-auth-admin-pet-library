import { NextResponse } from "next/server";
import { getInviteByToken } from "@/lib/onboarding";

export async function GET(_: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const invite = getInviteByToken(token);

  if (!invite) {
    return NextResponse.json({ error: "邀請不存在。" }, { status: 404 });
  }

  const expired = new Date(invite.expires_at).getTime() < Date.now();

  return NextResponse.json({
    ok: true,
    invite: {
      token: invite.token,
      parentName: invite.parent_name,
      expiresAt: invite.expires_at,
      usedAt: invite.used_at,
      expired,
    },
  });
}
