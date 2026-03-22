import { db } from "@/lib/db";

type TrackOnboardingEventInput = {
  event_name: string;
  invite_token?: string | null;
  step?: number | null;
  session_id?: string | null;
  child_username?: string | null;
  meta?: Record<string, unknown> | null;
};

function clampText(value: string | null | undefined, maxLength: number) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export function trackOnboardingEvent(input: TrackOnboardingEventInput) {
  const eventName = clampText(input.event_name, 64);

  if (!eventName) {
    throw new Error("event_name is required");
  }

  const step =
    typeof input.step === "number" && Number.isInteger(input.step) && input.step >= 1 && input.step <= 3
      ? input.step
      : null;

  const metaJson = input.meta ? JSON.stringify(input.meta).slice(0, 2000) : null;

  db.prepare(
    `
      INSERT INTO onboarding_events (
        event_name, invite_token, step, session_id, child_username, meta_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    eventName,
    clampText(input.invite_token, 128),
    step,
    clampText(input.session_id, 128),
    clampText(input.child_username, 64),
    metaJson,
    new Date().toISOString(),
  );
}

export function getOnboardingFunnel(days = 7, parentUserId?: number) {
  const rangeDays = Number.isInteger(days) && days >= 1 && days <= 30 ? days : 7;
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
  const parentFilter = typeof parentUserId === "number" ? "AND invite_token IN (SELECT token FROM parent_invites WHERE parent_user_id = ?)" : "";

  const rows = db
    .prepare(
      `
        SELECT event_name, step, invite_token, session_id
        FROM onboarding_events
        WHERE created_at >= ?
        ${parentFilter}
      `,
    )
    .all(...(typeof parentUserId === "number" ? [since, parentUserId] : [since])) as Array<{
    event_name: string;
    step: number | null;
    invite_token: string | null;
    session_id: string | null;
  }>;

  const keyForRow = (row: { session_id: string | null; invite_token: string | null }, index: number) =>
    row.session_id?.trim() || row.invite_token?.trim() || `row-${index}`;

  const onboardingViewUsers = new Set<string>();
  const step1Users = new Set<string>();
  const step2Users = new Set<string>();
  const step3Users = new Set<string>();
  const submitSuccessUsers = new Set<string>();
  let invalidCount = 0;
  let expiredCount = 0;
  let usedCount = 0;

  rows.forEach((row, index) => {
    const key = keyForRow(row, index);

    if (row.event_name === "onboarding_view") {
      onboardingViewUsers.add(key);
    }

    if (row.event_name === "step_view" && row.step === 1) {
      step1Users.add(key);
    }

    if (row.event_name === "step_view" && row.step === 2) {
      step2Users.add(key);
    }

    if (row.event_name === "step_view" && row.step === 3) {
      step3Users.add(key);
    }

    if (row.event_name === "submit_success") {
      submitSuccessUsers.add(key);
    }

    if (row.event_name === "invite_status_invalid") {
      invalidCount += 1;
    }

    if (row.event_name === "invite_status_expired") {
      expiredCount += 1;
    }

    if (row.event_name === "invite_status_used") {
      usedCount += 1;
    }
  });

  const onboardingViewCount = onboardingViewUsers.size;
  const submitSuccessCount = submitSuccessUsers.size;

  return {
    range_days: rangeDays,
    onboarding_view_users: onboardingViewCount,
    step1_users: step1Users.size,
    step2_users: step2Users.size,
    step3_users: step3Users.size,
    submit_success_users: submitSuccessCount,
    completion_rate: onboardingViewCount === 0 ? 0 : Number((submitSuccessCount / onboardingViewCount).toFixed(2)),
    invalid_count: invalidCount,
    expired_count: expiredCount,
    used_count: usedCount,
  };
}
