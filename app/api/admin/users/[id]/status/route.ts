import { NextResponse } from "next/server";
import { getUserForAdmin, setUserDisabledState } from "@/lib/admin";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminUser = await getSessionUser();

  if (!adminUser) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (!adminUser.is_admin) {
    return NextResponse.json({ error: "只有管理員可變更帳號狀態。" }, { status: 403 });
  }

  const { id } = await context.params;
  const userId = Number(id);
  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "使用者 ID 不正確。" }, { status: 400 });
  }

  if (action !== "disable" && action !== "enable") {
    return NextResponse.json({ error: "帳號狀態動作不正確。" }, { status: 400 });
  }

  const user = getUserForAdmin(userId);

  if (!user) {
    return NextResponse.json({ error: "找不到使用者。" }, { status: 404 });
  }

  if (user.id === adminUser.id && action === "disable") {
    return NextResponse.json({ error: "不可停用自己目前登入的管理員帳號。" }, { status: 400 });
  }

  const nextDisabled = action === "disable";
  const updated = setUserDisabledState(userId, nextDisabled);

  if (!updated) {
    return NextResponse.json({ error: "更新帳號狀態失敗。" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      isDisabled: nextDisabled,
    },
  });
}
