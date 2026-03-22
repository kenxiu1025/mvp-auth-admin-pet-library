"use client";

import { useState, useTransition } from "react";

type ShopItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  image_emoji: string;
  owned: number;
};

export function ShopPanel({
  initialItems,
  initialCoinBalance,
}: {
  initialItems: ShopItem[];
  initialCoinBalance: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [coinBalance, setCoinBalance] = useState(initialCoinBalance);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleBuy(shopItemId: number) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/shop/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shopItemId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "購買失敗");
        return;
      }

      setItems(payload.items);
      setCoinBalance(payload.coinBalance);
      setMessage(`已購買：${payload.item.name}`);
    });
  }

  const ownedItems = items.filter((item) => item.owned === 1);

  return (
    <div className="grid two">
      <section className="card">
        <h2 className="section-title">商店</h2>
        <p className="page-subtitle">目前貓星幣餘額：{coinBalance}</p>
        <div className="item-list">
          {items.map((item) => (
            <div key={item.id} className="shop-item">
              <div className="task-row">
                <div className="task-main">
                  <div className="pet-face" style={{ fontSize: "2.2rem" }}>
                    {item.image_emoji}
                  </div>
                  <div>
                    <p className="task-title">{item.name}</p>
                    <p className="task-meta">{item.description}</p>
                    <span className="pill side">{item.price} 貓星幣</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="button primary"
                  disabled={isPending || item.owned === 1 || coinBalance < item.price}
                  onClick={() => handleBuy(item.id)}
                >
                  {item.owned === 1 ? "已擁有" : "購買"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {message ? <div className={message.startsWith("已購買") ? "badge ok" : "badge danger"}>{message}</div> : null}
      </section>

      <section className="card">
        <h2 className="section-title">已購道具</h2>
        {ownedItems.length === 0 ? (
          <div className="empty">還沒有購買任何道具。</div>
        ) : (
          <div className="item-list">
            {ownedItems.map((item) => (
              <div key={item.id} className="inventory-item">
                {item.image_emoji} {item.name}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
