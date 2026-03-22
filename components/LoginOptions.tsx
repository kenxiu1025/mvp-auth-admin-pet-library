"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const options = [
  {
    username: "parent1",
    title: "parent1",
    petName: "家長控制台",
    roleLabel: "家長",
    icon: "🧑",
  },
  {
    username: "childA",
    title: "childA",
    petName: "Milo",
    roleLabel: "小孩",
    icon: "🐱",
  },
  {
    username: "childB",
    title: "childB",
    petName: "Luna",
    roleLabel: "小孩",
    icon: "🐱",
  },
] as const;

export function LoginOptions() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleLogin(username: "parent1" | "childA" | "childB") {
    setLoadingUser(username);
    setError("");

    const response = await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "登入失敗");
      setLoadingUser(null);
      return;
    }

    router.push(payload.user?.role === "parent" ? "/parent" : "/child");
    router.refresh();
  }

  return (
    <div className="grid">
      <div className="login-options">
        {options.map((option) => (
          <div key={option.username} className="card login-card">
            <div className="pet-face">{option.icon}</div>
            <div>
              <h2 className="section-title">{option.title}</h2>
              <p className="page-subtitle">
                身分：{option.roleLabel}
                <br />
                {option.roleLabel === "家長" ? "入口：派發與審核" : `貓咪：${option.petName}`}
              </p>
            </div>
            <button
              type="button"
              className="button primary"
              disabled={loadingUser !== null}
              onClick={() => handleLogin(option.username)}
            >
              {loadingUser === option.username ? "登入中..." : `以 ${option.title} 進入`}
            </button>
          </div>
        ))}
      </div>
      {error ? <div className="badge danger">{error}</div> : null}
    </div>
  );
}
