"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChildInviteOnboarding } from "@/components/ChildInviteOnboarding";

export function AuthPortal() {
  const router = useRouter();
  const search = useSearchParams();
  const inviteToken = search.get("invite");

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [parentUsername, setParentUsername] = useState("");
  const [parentDisplayName, setParentDisplayName] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitJson(url: string, body: object) {
    setLoading(true);
    setError("");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "操作失敗");
      setLoading(false);
      return;
    }

    const nextPath = payload.user?.is_admin ? "/admin" : payload.user?.role === "parent" ? "/parent" : "/child";
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="grid two">
      <section className="card">
        <h2 className="section-title">登入既有帳號</h2>
        <input className="input" placeholder="帳號（例如 parent1 / childA）" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} />
        <input
          className="input"
          type="password"
          placeholder="密碼（至少 8 碼）"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
        />
        <div className="inline-actions" style={{ marginTop: 12 }}>
          <button className="button secondary" disabled={loading} onClick={() => submitJson("/api/auth/login", { username: loginUsername, password: loginPassword })}>
            登入
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">家長註冊</h2>
        <input className="input" placeholder="家長帳號（英數）" value={parentUsername} onChange={(e) => setParentUsername(e.target.value)} />
        <input className="input" placeholder="家長顯示名稱" value={parentDisplayName} onChange={(e) => setParentDisplayName(e.target.value)} />
        <input
          className="input"
          type="password"
          placeholder="設定密碼（至少 8 碼）"
          value={parentPassword}
          onChange={(e) => setParentPassword(e.target.value)}
        />
        <div className="inline-actions" style={{ marginTop: 12 }}>
          <button
            className="button primary"
            disabled={loading}
            onClick={() => submitJson("/api/auth/register-parent", { username: parentUsername, displayName: parentDisplayName, password: parentPassword })}
          >
            建立家長帳號
          </button>
        </div>
      </section>

      {inviteToken ? <ChildInviteOnboarding inviteToken={inviteToken} /> : null}

      {error ? <div className="badge danger" style={{ gridColumn: "1 / -1" }}>{error}</div> : null}
    </div>
  );
}
