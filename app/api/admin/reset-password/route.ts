import { NextResponse } from "next/server";
import { getUserForAdmin, updateUserPassword } from "@/lib/admin";
import { getSessionUser, hashPassword, validatePassword } from "@/lib/auth";

export async function POST(request: Request) {
  const adminUser = await getSessionUser();

  if (!adminUser) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (!adminUser.is_admin) {
    return NextResponse.json({ error: "只有管理員可重設密碼。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const userId = Number(body?.userId);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "使用者 ID 不正確。" }, { status: 400 });
  }

  if (!validatePassword(password)) {
    return NextResponse.json({ error: "新密碼至少需要 8 個字元。" }, { status: 400 });
  }

  const user = getUserForAdmin(userId);

  if (!user) {
    return NextResponse.json({ error: "找不到使用者。" }, { status: 404 });
  }

  const updated = updateUserPassword(userId, hashPassword(password));

  if (!updated) {
    return NextResponse.json({ error: "重設密碼失敗。" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
    },
  });
}
