import { NextResponse } from "next/server";
import { acceptInvite } from "@/lib/onboarding";
import { getUserByUsername, hashPassword, setSessionCookie, validatePassword } from "@/lib/auth";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const body = await request.json().catch(() => null);

  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const petName = typeof body?.petName === "string" ? body.petName.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const species = body?.species;
  const style = body?.style;

  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
    return NextResponse.json({ error: "小孩帳號格式不正確。" }, { status: 400 });
  }

  if (!displayName || !petName) {
    return NextResponse.json({ error: "請填寫小孩名稱與角色名稱。" }, { status: 400 });
  }

  if (!validatePassword(password)) {
    return NextResponse.json({ error: "小孩密碼至少需要 8 個字元。" }, { status: 400 });
  }

  if (!["cat", "dog", "fox", "rabbit", "bear"].includes(species) || !["classic", "sport", "adventure"].includes(style)) {
    return NextResponse.json({ error: "角色設定不正確。" }, { status: 400 });
  }

  if (getUserByUsername(username)) {
    return NextResponse.json({ error: "此小孩帳號已存在。" }, { status: 409 });
  }

  try {
    acceptInvite({ token, username, displayName, petName, species, style, passwordHash: hashPassword(password) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "綁定失敗。" }, { status: 400 });
  }

  const user = getUserByUsername(username);
  const response = NextResponse.json({ ok: true, user });
  setSessionCookie(response, username);

  return response;
}
