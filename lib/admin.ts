import { db } from "@/lib/db";

export function getAdminOverview() {
  const parents = db
    .prepare(
      `
        SELECT id, username, display_name, is_admin, is_disabled, disabled_at, created_at
        FROM users
        WHERE role = 'parent'
        ORDER BY created_at ASC, id ASC
      `,
    )
    .all() as Array<{
    id: number;
    username: string;
    display_name: string;
    is_admin: number;
    is_disabled: number;
    disabled_at: string | null;
    created_at: string;
  }>;

  const children = db
    .prepare(
      `
        SELECT
          users.id,
          users.username,
          users.display_name,
          users.parent_user_id,
          parent.username AS parent_username,
          parent.display_name AS parent_display_name,
          pets.name AS pet_name,
          users.is_disabled,
          users.disabled_at
        FROM users
        LEFT JOIN users AS parent ON parent.id = users.parent_user_id
        LEFT JOIN pets ON pets.user_id = users.id
        WHERE users.role = 'child'
        ORDER BY parent.username ASC, users.username ASC
      `,
    )
    .all() as Array<{
    id: number;
    username: string;
    display_name: string;
    parent_user_id: number | null;
    parent_username: string | null;
    parent_display_name: string | null;
    pet_name: string | null;
    is_disabled: number;
    disabled_at: string | null;
  }>;

  return {
    totals: {
      parentCount: parents.length,
      childCount: children.length,
      familyCount: new Set(children.map((child) => child.parent_user_id).filter(Boolean)).size,
    },
    parents: parents.map((parent) => ({
      id: parent.id,
      username: parent.username,
      displayName: parent.display_name,
      isAdmin: Boolean(parent.is_admin),
      isDisabled: Boolean(parent.is_disabled),
      disabledAt: parent.disabled_at,
      createdAt: parent.created_at,
      children: children
        .filter((child) => child.parent_user_id === parent.id)
        .map((child) => ({
          id: child.id,
          username: child.username,
          displayName: child.display_name,
          petName: child.pet_name,
          isDisabled: Boolean(child.is_disabled),
          disabledAt: child.disabled_at,
        })),
    })),
  };
}

export function updateUserPassword(userId: number, passwordHash: string) {
  const result = db
    .prepare(
      `
        UPDATE users
        SET password_hash = ?
        WHERE id = ?
      `,
    )
    .run(passwordHash, userId);

  return result.changes > 0;
}

export function getUserForAdmin(userId: number) {
  return db
    .prepare(
      `
        SELECT id, username, display_name, role, parent_user_id, is_admin, is_disabled
        FROM users
        WHERE id = ?
      `,
    )
    .get(userId) as
    | {
        id: number;
        username: string;
        display_name: string;
        role: "parent" | "child";
        parent_user_id: number | null;
        is_admin: number;
        is_disabled: number;
      }
    | undefined;
}

export function setUserDisabledState(userId: number, isDisabled: boolean) {
  const result = db
    .prepare(
      `
        UPDATE users
        SET
          is_disabled = ?,
          disabled_at = ?
        WHERE id = ?
      `,
    )
    .run(isDisabled ? 1 : 0, isDisabled ? new Date().toISOString() : null, userId);

  return result.changes > 0;
}
