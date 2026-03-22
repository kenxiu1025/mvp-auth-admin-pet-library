type FunnelData = {
  range_days: number;
  onboarding_view_users: number;
  step1_users: number;
  step2_users: number;
  step3_users: number;
  submit_success_users: number;
  completion_rate: number;
  invalid_count: number;
  expired_count: number;
  used_count: number;
};

export function OnboardingFunnelCard({ data }: { data: FunnelData }) {
  return (
    <section className="card">
      <h2 className="section-title">Invite Onboarding 漏斗</h2>
      <p className="page-subtitle">近 {data.range_days} 天的 invite onboarding 轉化概況。</p>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">完成率</span>
          <span className="stat-value">{Math.round(data.completion_rate * 100)}%</span>
        </div>
        <div className="stat">
          <span className="stat-label">進入 onboarding</span>
          <span className="stat-value">{data.onboarding_view_users}</span>
        </div>
        <div className="stat">
          <span className="stat-label">完成綁定</span>
          <span className="stat-value">{data.submit_success_users}</span>
        </div>
      </div>

      <div className="history-table" style={{ marginTop: "14px" }}>
        <div className="history-header">Step 1</div>
        <div className="history-header">Step 2</div>
        <div className="history-header">Step 3</div>
        <div className="history-header">Success</div>
        <div className="history-header">Invalid</div>
        <div className="history-header">Expired/Used</div>

        <div className="history-row">
          <span>{data.step1_users}</span>
          <span>{data.step2_users}</span>
          <span>{data.step3_users}</span>
          <span>{data.submit_success_users}</span>
          <span>{data.invalid_count}</span>
          <span>{data.expired_count + data.used_count}</span>
        </div>
      </div>

      <p className="footer-note">
        Invalid：{data.invalid_count}，Expired：{data.expired_count}，Used：{data.used_count}
      </p>
    </section>
  );
}
