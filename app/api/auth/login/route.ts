import { NextResponse } from "next/server";
import { getUserAuthByUsername, getUserByUsername, setSessionCookie, validatePassword, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username) {
    return NextResponse.json({ error: "請輸入帳號。" }, { status: 400 });
  }

  if (!validatePassword(password)) {
    return NextResponse.json({ error: "請輸入至少 8 碼密碼。" }, { status: 400 });
  }

  const user = getUserAuthByUsername(username);

  if (!user) {
    return NextResponse.json({ error: "找不到帳號。" }, { status: 404 });
  }

  if (user.is_disabled) {
    return NextResponse.json({ error: "此帳號已停用，請聯絡管理員。" }, { status: 403 });
  }

  if (!verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "密碼不正確。" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, user: getUserByUsername(username) });
  setSessionCookie(response, username);
  return response;
}
