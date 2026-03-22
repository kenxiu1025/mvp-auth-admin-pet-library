"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/session", {
      method: "DELETE",
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" className="button secondary" onClick={handleLogout}>
      登出 / 切換身份
    </button>
  );
}
