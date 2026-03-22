import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPetSnapshot } from "@/lib/pet";
import { buyShopItem, getShopCatalog } from "@/lib/shop";

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "child") {
    return NextResponse.json({ error: "只有小孩帳號可購買道具。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const shopItemId = Number(body?.shopItemId);

  if (!Number.isInteger(shopItemId)) {
    return NextResponse.json({ error: "商品 ID 不正確。" }, { status: 400 });
  }

  try {
    const item = buyShopItem(user.id, shopItemId);
    return NextResponse.json({
      ok: true,
      item,
      items: getShopCatalog(user.id),
      coinBalance: getPetSnapshot(user.id).coinBalance,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "購買失敗。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
