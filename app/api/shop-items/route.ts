import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPetSnapshot } from "@/lib/pet";
import { getShopCatalog } from "@/lib/shop";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  if (user.role !== "child") {
    return NextResponse.json({ error: "只有小孩帳號可查看商店。" }, { status: 403 });
  }

  return NextResponse.json({
    items: getShopCatalog(user.id),
    coinBalance: getPetSnapshot(user.id).coinBalance,
  });
}
