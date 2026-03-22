"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CHARACTER_SPECIES, CHARACTER_STYLES } from "@/lib/characters";
import type { CharacterSpecies, CharacterStyle } from "@/lib/types";

type InviteAvailability = "loading" | "available" | "used" | "expired" | "missing" | "error";

type InviteInfo = {
  parentName: string;
  expiresAt: string;
  usedAt: string | null;
};

const TOTAL_STEPS = 3;

export function ChildInviteOnboarding({ inviteToken }: { inviteToken: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [childUsername, setChildUsername] = useState("");
  const [childDisplayName, setChildDisplayName] = useState("");
  const [childPassword, setChildPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [species, setSpecies] = useState<CharacterSpecies>(CHARACTER_SPECIES[0].value);
  const [style, setStyle] = useState<CharacterStyle>(CHARACTER_STYLES[0].value);
  const [petName, setPetName] = useState("");
  const [inviteStatus, setInviteStatus] = useState<InviteAvailability>("loading");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }

    return `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  });

  const selectedSpecies = useMemo(
    () => CHARACTER_SPECIES.find((item) => item.value === species),
    [species],
  );
  const selectedStyle = useMemo(
    () => CHARACTER_STYLES.find((item) => item.value === style),
    [style],
  );

  useEffect(() => {
    trackEvent("onboarding_view");
    void fetchInviteStatus();
  }, [inviteToken]);

  useEffect(() => {
    trackEvent("step_view", { step });
  }, [step]);

  function trackEvent(
    eventName: string,
    options?: {
      step?: number;
      meta?: Record<string, unknown>;
      childUsernameOverride?: string;
    },
  ) {
    void fetch("/api/analytics/onboarding-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_name: eventName,
        invite_token: inviteToken,
        session_id: sessionId,
        step: options?.step ?? null,
        child_username: options?.childUsernameOverride ?? (childUsername.trim() || null),
        meta: options?.meta ?? null,
      }),
    }).catch(() => {
      return null;
    });
  }

  async function fetchInviteStatus() {
    setInviteStatus("loading");
    setError("");

    const response = await fetch(`/api/invites/${inviteToken}`);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 404) {
        setInviteStatus("missing");
        trackEvent("invite_status_invalid");
        return;
      }

      setInviteStatus("error");
      setError(payload?.error ?? "讀取邀請狀態失敗");
      return;
    }

    const invite = payload?.invite;

    if (!invite) {
      setInviteStatus("error");
      setError("邀請資料不完整");
      return;
    }

    setInviteInfo({
      parentName: invite.parentName,
      expiresAt: invite.expiresAt,
      usedAt: invite.usedAt,
    });

    if (invite.usedAt) {
      setInviteStatus("used");
      trackEvent("invite_status_used");
      return;
    }

    if (invite.expired) {
      setInviteStatus("expired");
      trackEvent("invite_status_expired");
      return;
    }

    setInviteStatus("available");
    trackEvent("invite_status_loaded");
  }

  function validateStep(targetStep: number) {
    if (targetStep === 1) {
      if (!/^[a-zA-Z0-9_-]{3,32}$/.test(childUsername.trim())) {
        setError("請輸入 3-32 字元的小孩帳號，只能使用英數、底線或連字號。");
        trackEvent("step_validation_error", {
          step: 1,
          meta: { field: "username" },
          childUsernameOverride: childUsername.trim(),
        });
        return false;
      }

      if (!childDisplayName.trim()) {
        setError("請輸入小孩顯示名稱。");
        trackEvent("step_validation_error", {
          step: 1,
          meta: { field: "displayName" },
          childUsernameOverride: childUsername.trim(),
        });
        return false;
      }

      if (childPassword.trim().length < 8) {
        setError("請設定至少 8 個字元的小孩密碼。");
        trackEvent("step_validation_error", {
          step: 1,
          meta: { field: "password" },
          childUsernameOverride: childUsername.trim(),
        });
        return false;
      }

      if (childPassword !== confirmPassword) {
        setError("兩次輸入的小孩密碼不一致。");
        trackEvent("step_validation_error", {
          step: 1,
          meta: { field: "confirmPassword" },
          childUsernameOverride: childUsername.trim(),
        });
        return false;
      }
    }

    if (targetStep === 2) {
      if (!species || !style) {
        setError("請完成角色設定。");
        return false;
      }
    }

    if (targetStep === 3) {
      if (!petName.trim()) {
        setError("請輸入角色名字。");
        trackEvent("step_validation_error", {
          step: 3,
          meta: { field: "petName" },
          childUsernameOverride: childUsername.trim(),
        });
        return false;
      }
    }

    setError("");
    return true;
  }

  function handleNext() {
    if (!validateStep(step)) {
      return;
    }

    trackEvent("step_next_click", { step, childUsernameOverride: childUsername.trim() });
    setStep((current) => Math.min(TOTAL_STEPS, current + 1));
  }

  function handleBack() {
    setError("");
    trackEvent("step_back_click", { step, childUsernameOverride: childUsername.trim() });
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleComplete() {
    if (!validateStep(3) || inviteStatus !== "available") {
      return;
    }

    setLoading(true);
    setError("");
    trackEvent("submit_click", { step: 3, childUsernameOverride: childUsername.trim() });

    const response = await fetch(`/api/invites/${inviteToken}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: childUsername.trim(),
        displayName: childDisplayName.trim(),
        petName: petName.trim(),
        species,
        style,
        password: childPassword,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "綁定失敗");
      trackEvent("submit_fail", {
        step: 3,
        childUsernameOverride: childUsername.trim(),
        meta: {
          error_code: response.status,
          message: payload.error ?? "綁定失敗",
        },
      });
      setLoading(false);
      return;
    }

    trackEvent("submit_success", { step: 3, childUsernameOverride: childUsername.trim() });
    router.push("/child");
    router.refresh();
  }

  function renderInviteStatus() {
    if (inviteStatus === "loading") {
      return <div className="badge">邀請狀態讀取中...</div>;
    }

    if (inviteStatus === "available" && inviteInfo) {
      return (
        <div className="badge ok">
          由 {inviteInfo.parentName} 家長邀請
        </div>
      );
    }

    if (inviteStatus === "used") {
      return <div className="badge danger">此邀請連結已使用，無法繼續綁定。</div>;
    }

    if (inviteStatus === "expired") {
      return <div className="badge danger">此邀請連結已過期，請請家長重新發送。</div>;
    }

    if (inviteStatus === "missing") {
      return <div className="badge danger">找不到邀請連結，請確認連結是否正確。</div>;
    }

    return (
      <div className="grid">
        <div className="badge danger">{error || "讀取邀請狀態失敗"}</div>
        <button type="button" className="button secondary" onClick={() => void fetchInviteStatus()}>
          重新讀取邀請
        </button>
      </div>
    );
  }

  return (
    <section className="card" style={{ gridColumn: "1 / -1" }}>
      <div className="task-row">
        <div>
          <h2 className="section-title">小孩綁定角色（邀請）</h2>
          <p className="page-subtitle">透過 3 個步驟完成孩子角色初始化，資料可返回上一步調整。</p>
        </div>
        <span className="badge">步驟 {step}/{TOTAL_STEPS}</span>
      </div>

      {renderInviteStatus()}

      <div className="stepper-shell">
        <div className="stepper-track" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <div
              key={index + 1}
              className={`stepper-dot ${step >= index + 1 ? "active" : ""}`}
            />
          ))}
        </div>

        <div className="card stepper-panel">
          {step === 1 ? (
            <div className="grid">
              <h3 className="section-title">Step 1：基本資料</h3>
              <input
                className="input"
                placeholder="小孩帳號（英數）"
                value={childUsername}
                onChange={(event) => setChildUsername(event.target.value)}
              />
              <input
                className="input"
                placeholder="小孩顯示名稱"
                value={childDisplayName}
                onChange={(event) => setChildDisplayName(event.target.value)}
              />
              <input
                className="input"
                type="password"
                placeholder="設定小孩密碼（至少 8 碼）"
                value={childPassword}
                onChange={(event) => setChildPassword(event.target.value)}
              />
              <input
                className="input"
                type="password"
                placeholder="再次輸入小孩密碼"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid">
              <h3 className="section-title">Step 2：角色設定</h3>
              <div>
                <label className="task-meta">選擇動物</label>
                <div className="choice-grid">
                  {CHARACTER_SPECIES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`button secondary ${species === item.value ? "choice-active" : ""}`}
                      onClick={() => setSpecies(item.value)}
                    >
                      {item.emoji} {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="task-meta">選擇造型</label>
                <div className="choice-grid">
                  {CHARACTER_STYLES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`button secondary ${style === item.value ? "choice-active" : ""}`}
                      onClick={() => setStyle(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid">
              <h3 className="section-title">Step 3：命名與確認</h3>
              <input
                className="input"
                placeholder="角色名字（例如 Milo）"
                value={petName}
                onChange={(event) => setPetName(event.target.value)}
              />

              <div className="inventory-item">
                <p className="task-title">確認摘要</p>
                <p className="task-meta">孩子：{childDisplayName || "未填寫"}（{childUsername || "未填寫帳號"}）</p>
                <p className="task-meta">登入密碼：{childPassword ? "已設定" : "未設定"}</p>
                <p className="task-meta">
                  動物：{selectedSpecies?.emoji} {selectedSpecies?.label}
                </p>
                <p className="task-meta">造型：{selectedStyle?.label}</p>
                <p className="task-meta">角色名：{petName || "未填寫"}</p>
              </div>
            </div>
          ) : null}

          {error && inviteStatus !== "error" ? <div className="badge danger">{error}</div> : null}

          <div className="inline-actions">
            <button type="button" className="button secondary" onClick={handleBack} disabled={loading || step === 1}>
              上一步
            </button>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className="button primary"
                onClick={handleNext}
                disabled={loading || inviteStatus !== "available"}
              >
                下一步
              </button>
            ) : null}

            {step === TOTAL_STEPS && inviteStatus === "available" ? (
              <button type="button" className="button primary" onClick={handleComplete} disabled={loading}>
                {loading ? "提交中..." : "完成綁定"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
