import crypto from "crypto";
import { db } from "@/lib/db";
import { getTodayInHongKong } from "@/lib/date";
import { getDefaultPetAssetId } from "@/lib/pet-assets";
import { refreshDailySummary } from "@/lib/pet";
import type { CharacterSpecies, CharacterStyle } from "@/lib/types";

export function createParent(username: string, displayName: string, passwordHash: string, isAdmin = false) {
  const result = db
    .prepare(
      `
      INSERT INTO users (username, display_name, role, password_hash, is_admin, created_at)
      VALUES (?, ?, 'parent', ?, ?, ?)
    `,
    )
    .run(username, displayName, passwordHash, isAdmin ? 1 : 0, new Date().toISOString());

  return Number(result.lastInsertRowid);
}

export function createInvite(parentUserId: number, hours = 24) {
  const token = crypto.randomBytes(12).toString("hex");
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

  db.prepare(
    `
      INSERT INTO parent_invites (token, parent_user_id, expires_at)
      VALUES (?, ?, ?)
    `,
  ).run(token, parentUserId, expiresAt);

  return { token, expiresAt };
}

export function getInviteByToken(token: string) {
  return db
    .prepare(
      `
        SELECT parent_invites.id, parent_invites.token, parent_invites.parent_user_id, parent_invites.expires_at,
               parent_invites.used_at, users.display_name AS parent_name
        FROM parent_invites
        INNER JOIN users ON users.id = parent_invites.parent_user_id
        WHERE parent_invites.token = ?
      `,
    )
    .get(token) as
    | {
        id: number;
        token: string;
        parent_user_id: number;
        expires_at: string;
        used_at: string | null;
        parent_name: string;
      }
    | undefined;
}

export function acceptInvite(input: {
  token: string;
  username: string;
  displayName: string;
  petName: string;
  species: CharacterSpecies;
  style: CharacterStyle;
  passwordHash: string;
}) {
  const invite = getInviteByToken(input.token);

  if (!invite) {
    throw new Error("邀請連結不存在。");
  }

  if (invite.used_at) {
    throw new Error("邀請連結已被使用。");
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error("邀請連結已過期。");
  }

  const transaction = db.transaction(() => {
    const defaultPetAssetId = getDefaultPetAssetId(input.species);
    const userResult = db
      .prepare(
        `
          INSERT INTO users (username, display_name, role, parent_user_id, password_hash, created_at)
          VALUES (?, ?, 'child', ?, ?, ?)
        `,
      )
      .run(input.username, input.displayName, invite.parent_user_id, input.passwordHash, new Date().toISOString());

    const childUserId = Number(userResult.lastInsertRowid);

    db.prepare(
      `
        INSERT INTO pets (user_id, name, species, style, selected_pet_asset_id, created_at, initialized_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      childUserId,
      input.petName,
      input.species,
      input.style,
      defaultPetAssetId,
      new Date().toISOString(),
      new Date().toISOString(),
    );

    db.prepare(
      `
        INSERT INTO daily_summary (
          user_id, summary_date, food_earned, coin_earned, completed_main, completed_side,
          total_tasks, completion_rate, mood, pet_status, updated_at
        )
        VALUES (?, ?, 0, 0, 0, 0, 0, 0, 'angry', 'hungry', ?)
        ON CONFLICT(user_id, summary_date) DO NOTHING
      `,
    ).run(childUserId, getTodayInHongKong(), new Date().toISOString());

    db.prepare(
      `
        UPDATE parent_invites
        SET used_at = ?, used_by_user_id = ?
        WHERE id = ?
      `,
    ).run(new Date().toISOString(), childUserId, invite.id);

    refreshDailySummary(childUserId);

    return childUserId;
  });

  return transaction();
}

export function listChildrenForParent(parentUserId: number) {
  return db
    .prepare(
      `
        SELECT users.id, users.username, users.display_name, pets.name AS pet_name
        FROM users
        LEFT JOIN pets ON pets.user_id = users.id
        WHERE users.role = 'child' AND users.parent_user_id = ?
        ORDER BY users.created_at ASC, users.id ASC
      `,
    )
    .all(parentUserId) as Array<{
    id: number;
    username: string;
    display_name: string;
    pet_name: string | null;
  }>;
}
