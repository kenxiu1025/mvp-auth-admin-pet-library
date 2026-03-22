"use client";

import { useState, useTransition } from "react";

type AdminOverview = {
  totals: {
    parentCount: number;
    childCount: number;
    familyCount: number;
  };
  parents: Array<{
    id: number;
    username: string;
    displayName: string;
    isAdmin: boolean;
    isDisabled: boolean;
    disabledAt: string | null;
    createdAt: string;
    children: Array<{
      id: number;
      username: string;
      displayName: string;
      petName: string | null;
      isDisabled: boolean;
      disabledAt: string | null;
    }>;
  }>;
};

export function AdminConsole({ initialData }: { initialData: AdminOverview }) {
  const [data, setData] = useState(initialData);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showDisabledOnly, setShowDisabledOnly] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function refreshOverview(silent = false) {
    const response = await fetch("/api/admin/overview");
    const payload = await response.json();

    if (!response.ok) {
      if (!silent) {
        setMessage(payload.error ?? "讀取管理員資料失敗");
      }
      return;
    }

    setData(payload);
    if (!silent) {
      setMessage("已更新管理員總覽。");
    }
  }

  function updateDraft(userId: number, value: string) {
    setPasswordDrafts((current) => ({
      ...current,
      [userId]: value,
    }));
  }

  function submitReset(userId: number) {
    const password = passwordDrafts[userId] ?? "";

    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "重設密碼失敗");
        return;
      }

      setPasswordDrafts((current) => ({
        ...current,
        [userId]: "",
      }));
      setMessage(`已重設 ${payload.user?.displayName ?? payload.user?.username ?? "使用者"} 的密碼。`);
      await refreshOverview(true);
    });
  }

  function toggleDisabled(userId: number, nextAction: "disable" | "enable") {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: nextAction }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "更新帳號狀態失敗");
        return;
      }

      setMessage(
        `${payload.user?.displayName ?? payload.user?.username ?? "使用者"} 已${payload.user?.isDisabled ? "停用" : "重新啟用"}。`,
      );
      await refreshOverview(true);
    });
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredParents = data.parents.filter((parent) => {
    const filteredChildren = parent.children.filter((child) => {
      const childMatchesQuery =
        !normalizedQuery ||
        child.username.toLowerCase().includes(normalizedQuery) ||
        child.displayName.toLowerCase().includes(normalizedQuery) ||
        (child.petName ?? "").toLowerCase().includes(normalizedQuery);

      if (!childMatchesQuery) {
        return false;
      }

      return showDisabledOnly ? child.isDisabled : true;
    });

    const parentMatchesQuery =
      !normalizedQuery ||
      parent.username.toLowerCase().includes(normalizedQuery) ||
      parent.displayName.toLowerCase().includes(normalizedQuery);

    const parentPassesDisabled = showDisabledOnly ? parent.isDisabled : true;

    return (parentMatchesQuery && parentPassesDisabled) || filteredChildren.length > 0;
  });

  return (
    <section className="card">
      <div className="task-row">
        <div>
          <h2 className="section-title">管理員控制台</h2>
          <p className="page-subtitle">查看家長數量、親子綁定關係，並協助重設帳號密碼。</p>
        </div>
        <button type="button" className="button secondary" disabled={isPending} onClick={() => startTransition(async () => refreshOverview(false))}>
          重新整理
        </button>
      </div>

      {message ? <div className="badge ok">{message}</div> : null}

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">家長數</span>
          <span className="stat-value">{data.totals.parentCount}</span>
        </div>
        <div className="stat">
          <span className="stat-label">孩子數</span>
          <span className="stat-value">{data.totals.childCount}</span>
        </div>
        <div className="stat">
          <span className="stat-label">家庭數</span>
          <span className="stat-value">{data.totals.familyCount}</span>
        </div>
      </div>

      <div className="inline-actions" style={{ marginTop: 16 }}>
        <input
          className="input"
          placeholder="搜尋家長、孩子、角色名"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <label className="inventory-item" style={{ minWidth: 180 }}>
          <input
            type="checkbox"
            checked={showDisabledOnly}
            onChange={(event) => setShowDisabledOnly(event.target.checked)}
          />{" "}
          只看已停用帳號
        </label>
      </div>

      <div className="item-list" style={{ marginTop: 16 }}>
        {filteredParents.length === 0 ? <div className="empty">目前沒有符合搜尋或停用篩選條件的帳號。</div> : null}
        {filteredParents.map((parent) => {
          const visibleChildren = parent.children.filter((child) => {
            const childMatchesQuery =
              !normalizedQuery ||
              child.username.toLowerCase().includes(normalizedQuery) ||
              child.displayName.toLowerCase().includes(normalizedQuery) ||
              (child.petName ?? "").toLowerCase().includes(normalizedQuery);

            if (!childMatchesQuery) {
              return false;
            }

            return showDisabledOnly ? child.isDisabled : true;
          });

          const parentMatchesQuery =
            !normalizedQuery ||
            parent.username.toLowerCase().includes(normalizedQuery) ||
            parent.displayName.toLowerCase().includes(normalizedQuery);
          const showParentCard = parentMatchesQuery || visibleChildren.length > 0;

          if (!showParentCard) {
            return null;
          }

          return (
            <div key={parent.id} className="inventory-item">
              <div className="task-row">
                <div>
                  <p className="task-title">
                    {parent.displayName} ({parent.username})
                  </p>
                  <p className="task-meta">
                    {parent.isAdmin ? "管理員 / " : ""}
                    {parent.isDisabled ? "已停用 / " : ""}
                    綁定孩子 {parent.children.length} 位
                  </p>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  disabled={isPending || parent.isAdmin}
                  onClick={() => toggleDisabled(parent.id, parent.isDisabled ? "enable" : "disable")}
                >
                  {parent.isAdmin ? "管理員不可停用" : parent.isDisabled ? "重新啟用" : "停用帳號"}
                </button>
              </div>

              <div className="item-list" style={{ marginTop: 10 }}>
                <div className="shop-item">
                  <p className="task-meta">重設家長密碼</p>
                  <div className="inline-actions" style={{ marginTop: 8 }}>
                    <input
                      className="input"
                      type="password"
                      placeholder="新密碼（至少 8 碼）"
                      value={passwordDrafts[parent.id] ?? ""}
                      onChange={(event) => updateDraft(parent.id, event.target.value)}
                    />
                    <button type="button" className="button primary" disabled={isPending} onClick={() => submitReset(parent.id)}>
                      重設
                    </button>
                  </div>
                </div>

                {visibleChildren.map((child) => (
                  <div key={child.id} className="shop-item">
                    <p className="task-title">
                      {child.displayName} ({child.username})
                    </p>
                    <p className="task-meta">
                      角色：{child.petName ?? "未命名"} / {child.isDisabled ? "已停用" : "使用中"}
                    </p>
                    <div className="inline-actions" style={{ marginTop: 8 }}>
                      <input
                        className="input"
                        type="password"
                        placeholder="替孩子設定新密碼"
                        value={passwordDrafts[child.id] ?? ""}
                        onChange={(event) => updateDraft(child.id, event.target.value)}
                      />
                      <button type="button" className="button secondary" disabled={isPending} onClick={() => submitReset(child.id)}>
                        重設
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={isPending}
                        onClick={() => toggleDisabled(child.id, child.isDisabled ? "enable" : "disable")}
                      >
                        {child.isDisabled ? "重新啟用" : "停用帳號"}
                      </button>
                    </div>
                  </div>
                ))}

                {visibleChildren.length === 0 ? <div className="badge">這個家長在目前篩選條件下沒有符合的孩子。</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
