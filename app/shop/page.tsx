import { LogoutButton } from "@/components/LogoutButton";
import { ShopPanel } from "@/components/ShopPanel";
import { requireRole } from "@/lib/auth";
import { getPetSnapshot } from "@/lib/pet";
import { getShopCatalog } from "@/lib/shop";

export default async function ShopPage() {
  const user = await requireRole("child");

  const items = getShopCatalog(user.id);
  const pet = getPetSnapshot(user.id);

  return (
    <main className="grid">
      <section className="card hero-card">
        <div className="task-row">
          <div>
            <h1 className="page-title">商店</h1>
            <p className="page-subtitle">使用貓星幣任務賺到的貓星幣兌換貓咪裝飾道具。</p>
          </div>
          <LogoutButton />
        </div>
      </section>
      <ShopPanel initialItems={items} initialCoinBalance={pet.coinBalance} />
    </main>
  );
}
