"use client";

import { useState, useTransition } from "react";

export function ParentInvitePanel() {
  const [inviteUrl, setInviteUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function createInvite() {
    startTransition(async () => {
      const response = await fetch("/api/parent/invites", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "建立邀請失敗");
        return;
      }

      setInviteUrl(payload.inviteUrl ?? "");
      setExpiresAt(payload.expiresAt ?? "");
      setMessage("已建立邀請連結。");
    });
  }

  async function copyInvite() {
    if (!inviteUrl) {
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}${inviteUrl}`);
    setMessage("邀請連結已複製。");
  }

  return (
    <section className="card">
      <h2 className="section-title">邀請孩子</h2>
      <p className="page-subtitle">先建立邀請連結，再分享給孩子完成角色初始化。</p>
      <div className="inline-actions">
        <button type="button" className="button primary" disabled={isPending} onClick={createInvite}>
          {isPending ? "建立中..." : "產生邀請連結"}
        </button>
        <button type="button" className="button secondary" disabled={!inviteUrl} onClick={copyInvite}>
          複製連結
        </button>
      </div>
      {inviteUrl ? <div className="inventory-item" style={{ marginTop: 10 }}>{inviteUrl}</div> : null}
      {expiresAt ? <p className="footer-note">有效至：{new Date(expiresAt).toLocaleString("zh-HK")}</p> : null}
      {message ? <div className="badge ok">{message}</div> : null}
    </section>
  );
}
