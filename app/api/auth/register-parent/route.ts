import { NextResponse } from "next/server";
import { hashPassword, setSessionCookie, validatePassword } from "@/lib/auth";
import { createParent } from "@/lib/onboarding";
import { getUserByUsername } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
    return NextResponse.json({ error: "帳號需為 3-32 位英數、底線或連字號。" }, { status: 400 });
  }

  if (!displayName) {
    return NextResponse.json({ error: "請輸入家長顯示名稱。" }, { status: 400 });
  }

  if (!validatePassword(password)) {
    return NextResponse.json({ error: "密碼至少需要 8 個字元。" }, { status: 400 });
  }

  if (getUserByUsername(username)) {
    return NextResponse.json({ error: "帳號已存在。" }, { status: 409 });
  }

  try {
    createParent(username, displayName, hashPassword(password));
  } catch {
    return NextResponse.json({ error: "建立家長帳號失敗。" }, { status: 500 });
  }

  const user = getUserByUsername(username);
  const response = NextResponse.json({ ok: true, user });
  setSessionCookie(response, username);

  return response;
}
