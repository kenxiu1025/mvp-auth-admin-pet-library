type PetSnapshot = {
  childName: string;
  petName: string;
  petAssetKey: string;
  petAssetName: string;
  todayFood: number;
  todayCoin: number;
  coinBalance: number;
  mood: "happy" | "calm" | "angry";
  petStatus: "hungry" | "normal";
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  foodThreshold: number;
  imagePath: string;
};

const moodLabel = {
  happy: "開心",
  calm: "平靜",
  angry: "生氣",
};

const statusLabel = {
  hungry: "肚子餓",
  normal: "正常",
};

export function PetStatusPanel({ pet }: { pet: PetSnapshot }) {
  return (
    <div className="grid">
      <section className="card hero-card">
        <div className="grid two">
          <div>
            <img className="pet-image" src={pet.imagePath} alt={`${pet.petName} 狀態圖`} />
            <h1 className="page-title">{pet.petName}</h1>
            <p className="page-subtitle">
              {pet.childName} 的貓咪，今天已批准 {pet.completedTasks}/{pet.totalTasks} 項任務。
            </p>
            <p className="footer-note">素材角色：{pet.petAssetName}（{pet.petAssetKey}）</p>
            <div className="inline-actions">
              <span className={`badge ${pet.petStatus === "hungry" ? "danger" : "ok"}`}>
                狀態：{statusLabel[pet.petStatus]}
              </span>
              <span className="badge">情緒：{moodLabel[pet.mood]}</span>
            </div>
          </div>
          <div className="stat-row">
            <div className="stat">
              <span className="stat-label">今日貓糧</span>
              <span className="stat-value">{pet.todayFood}</span>
            </div>
            <div className="stat">
              <span className="stat-label">今日貓星幣</span>
              <span className="stat-value">{pet.todayCoin}</span>
            </div>
            <div className="stat">
              <span className="stat-label">貓星幣餘額</span>
              <span className="stat-value">{pet.coinBalance}</span>
            </div>
            <div className="stat">
              <span className="stat-label">完成率</span>
              <span className="stat-value">{Math.round(pet.completionRate * 100)}%</span>
            </div>
          </div>
        </div>
      </section>
      <section className="card">
        <h2 className="section-title">今日規則摘要</h2>
        <div className="task-list">
          <div className="inventory-item">貓糧任務每項 +10 貓糧，貓星幣任務每項 +10 貓星幣。</div>
          <div className="inventory-item">當日貓糧小於 {pet.foodThreshold} 時，貓咪狀態會是 hungry。</div>
          <div className="inventory-item">貓糧達到 {pet.foodThreshold} 以上時，狀態至少 normal，再依完成率決定情緒。</div>
        </div>
      </section>
      <section className="card">
        <h2 className="section-title">情緒規則說明卡</h2>
        <div className="task-list">
          <div className="inventory-item">貓糧 &lt; {pet.foodThreshold} =&gt; hungry</div>
          <div className="inventory-item">貓糧 &gt;= {pet.foodThreshold} 且 completionRate &gt;= 0.8 =&gt; happy</div>
          <div className="inventory-item">貓糧 &gt;= {pet.foodThreshold} 且 completionRate &gt;= 0.5 =&gt; calm</div>
          <div className="inventory-item">其餘 =&gt; angry（狀態仍為 normal）</div>
        </div>
      </section>
    </div>
  );
}
