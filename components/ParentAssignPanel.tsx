"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type Template = {
  title: string;
  taskType: "main" | "side";
};

type AssignResult = {
  username: string;
  displayName: string;
  assigned: number;
  skippedDuplicates: number;
  skippedLimit: number;
  finalTaskCount: number;
};

type ChildOption = {
  id: number;
  username: string;
  display_name: string;
};

export function ParentAssignPanel({ templates, today }: { templates: Template[]; today: string }) {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [target, setTarget] = useState<string>("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>(templates.map((template) => `${template.taskType}:${template.title}`));
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"ok" | "danger">("ok");
  const [results, setResults] = useState<AssignResult[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/parent/children");
      const payload = await response.json();
      if (response.ok) {
        setChildren(payload.children ?? []);
      }
      setChildrenLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (target === "all") {
      return;
    }

    if (!children.some((child) => child.username === target)) {
      setTarget("all");
    }
  }, [children, target]);

  const groupedTemplates = useMemo(
    () => ({
      main: templates.filter((template) => template.taskType === "main"),
      side: templates.filter((template) => template.taskType === "side"),
    }),
    [templates],
  );

  function toggleTemplate(key: string) {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  function handleAssign() {
    const tasks = templates.filter((template) => selectedKeys.includes(`${template.taskType}:${template.title}`));
    const targetUsers = target === "all" ? children.map((child) => child.username) : [target];

    startTransition(async () => {
      setMessage("");
      setMessageTone("ok");
      setResults([]);
      const response = await fetch("/api/parent/assign-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsers, tasks, dueDate: today }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "派發失敗");
        setMessageTone("danger");
        return;
      }

      setResults(payload.results ?? []);
      setMessage(`已派發到 ${payload.dueDate}`);
      setMessageTone("ok");
    });
  }

  return (
    <div className="grid two">
      <section className="card">
        <h2 className="section-title">選擇派發對象</h2>
        {!childrenLoaded ? (
          <div className="badge">載入你名下的孩子名單中...</div>
        ) : children.length === 0 ? (
          <div className="badge danger">你目前還沒有綁定任何孩子，請先用邀請連結完成綁定。</div>
        ) : (
          <>
            <div className="inline-actions">
              <label className="inventory-item" style={{ flex: "1 1 150px" }}>
                <input type="radio" name="target" checked={target === "all"} onChange={() => setTarget("all")} /> 全部孩子
              </label>
              {children.map((child) => (
                <label key={child.id} className="inventory-item" style={{ flex: "1 1 150px" }}>
                  <input
                    type="radio"
                    name="target"
                    checked={target === child.username}
                    onChange={() => setTarget(child.username)}
                  />{" "}
                  {child.display_name}
                </label>
              ))}
            </div>
            <p className="footer-note">這裡只會顯示你名下孩子。可選單一孩子或全部，派發日期預設為今天。</p>
          </>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">派發動作</h2>
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">派發日期</span>
            <span className="stat-value">{today}</span>
          </div>
          <div className="stat">
            <span className="stat-label">已選模板</span>
            <span className="stat-value">{selectedKeys.length}</span>
          </div>
        </div>
        <div className="inline-actions" style={{ marginTop: "12px" }}>
          <button type="button" className="button primary" disabled={isPending || children.length === 0} onClick={handleAssign}>
            {isPending ? "派發中..." : "派發到今日"}
          </button>
        </div>
        {message ? <div className={`badge ${messageTone}`}>{message}</div> : null}
      </section>

      <section className="card">
        <h2 className="section-title">貓糧任務模板</h2>
        <div className="item-list">
          {groupedTemplates.main.map((template) => {
            const key = `${template.taskType}:${template.title}`;
            return (
              <label key={key} className="task-item">
                <input type="checkbox" checked={selectedKeys.includes(key)} onChange={() => toggleTemplate(key)} /> {template.title}
              </label>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">貓星幣任務模板</h2>
        <div className="item-list">
          {groupedTemplates.side.map((template) => {
            const key = `${template.taskType}:${template.title}`;
            return (
              <label key={key} className="task-item">
                <input type="checkbox" checked={selectedKeys.includes(key)} onChange={() => toggleTemplate(key)} /> {template.title}
              </label>
            );
          })}
        </div>
      </section>

      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <h2 className="section-title">派發結果</h2>
        {results.length === 0 ? (
          <div className="empty">派發後會顯示每位孩子新增成功、重複略過與超過每日上限數量。</div>
        ) : (
          <div className="item-list">
            {results.map((result) => (
              <div key={result.username} className="inventory-item">
                {result.displayName}：新增 {result.assigned}，重複略過 {result.skippedDuplicates}，超上限略過 {result.skippedLimit}，今日總數 {result.finalTaskCount}。
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
