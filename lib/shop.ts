import { db } from "@/lib/db";
import { getCoinBalance } from "@/lib/pet";

export function getShopCatalog(userId: number) {
  return db
    .prepare(
      `
        SELECT
          shop_items.id,
          shop_items.name,
          shop_items.description,
          shop_items.price,
          shop_items.image_emoji,
          CASE WHEN inventory.id IS NULL THEN 0 ELSE 1 END AS owned
        FROM shop_items
        LEFT JOIN inventory
          ON inventory.shop_item_id = shop_items.id
          AND inventory.user_id = ?
        ORDER BY shop_items.price ASC, shop_items.id ASC
      `,
    )
    .all(userId) as Array<{
    id: number;
    name: string;
    description: string;
    price: number;
    image_emoji: string;
    owned: number;
  }>;
}

export function buyShopItem(userId: number, shopItemId: number) {
  const item = db
    .prepare(
      `
        SELECT id, name, price
        FROM shop_items
        WHERE id = ?
      `,
    )
    .get(shopItemId) as { id: number; name: string; price: number } | undefined;

  if (!item) {
    throw new Error("找不到商品。");
  }

  const owned = db
    .prepare(
      `
        SELECT id
        FROM inventory
        WHERE user_id = ? AND shop_item_id = ?
      `,
    )
    .get(userId, shopItemId) as { id: number } | undefined;

  if (owned) {
    throw new Error("這個道具已經購買過了。");
  }

  const balance = getCoinBalance(userId);

  if (balance < item.price) {
    throw new Error("貓星幣不足，無法購買。");
  }

  db.prepare(
    `
      INSERT INTO inventory (user_id, shop_item_id, purchased_at)
      VALUES (?, ?, ?)
    `,
  ).run(userId, shopItemId, new Date().toISOString());

  return item;
}
