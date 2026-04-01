import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import type { SessionUser, UserRole } from "@/lib/types";

const SESSION_COOKIE = "pet_user";
const PASSWORD_MIN_LENGTH = 8;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return secret;
}

type UserRecord = {
  id: number;
  username: string;
  display_name: string;
  role: UserRole;
  parent_user_id: number | null;
  pet_name: string | null;
  is_admin: number;
  is_disabled: number;
  disabled_at: string | null;
};

type UserAuthRecord = UserRecord & {
  password_hash: string | null;
};

export async function getSessionUsername(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const payload = jwt.verify(token, getSessionSecret()) as { username: string };
    const username = payload.username;
    if (!username || typeof username !== "string" || !/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
      return null;
    }
    return username;
  } catch {
    return null;
  }
}

export async function requireSessionUsername() {
  const username = await getSessionUsername();

  if (!username) {
    redirect("/login");
  }

  return username;
}

export function getUserByUsername(username: string) {
  return db
    .prepare(
      `
        SELECT users.id, users.username, users.display_name, users.role, users.parent_user_id, pets.name AS pet_name, users.is_admin
             , users.is_disabled, users.disabled_at
        FROM users
        LEFT JOIN pets ON pets.user_id = users.id
        WHERE users.username = ?
      `,
    )
    .get(username) as UserRecord | undefined;
}

export function getUserAuthByUsername(username: string) {
  return db
    .prepare(
      `
        SELECT users.id, users.username, users.display_name, users.role, users.parent_user_id, pets.name AS pet_name,
               users.is_admin, users.password_hash, users.is_disabled, users.disabled_at
        FROM users
        LEFT JOIN pets ON pets.user_id = users.id
        WHERE users.username = ?
      `,
    )
    .get(username) as UserAuthRecord | undefined;
}

export async function getSessionUser() {
  const username = await getSessionUsername();
  const user = username ? getUserByUsername(username) ?? null : null;
  return user && !user.is_disabled ? user : null;
}

export async function requireSessionUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(role: UserRole) {
  const user = await requireSessionUser();

  if (user.role !== role) {
    if (user.is_admin) {
      redirect("/admin");
    }

    redirect(user.role === "parent" ? "/parent" : "/child");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireSessionUser();

  if (!user.is_admin) {
    redirect(user.role === "child" ? "/child" : "/parent");
  }

  return user;
}

export function validatePassword(password: string) {
  return password.trim().length >= PASSWORD_MIN_LENGTH;
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) {
    return false;
  }

  const [salt, storedHash] = passwordHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const derivedHash = crypto.scryptSync(password, salt, 64).toString("hex");
  const storedBuffer = Buffer.from(storedHash, "hex");
  const derivedBuffer = Buffer.from(derivedHash, "hex");

  if (storedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, derivedBuffer);
}

export function setSessionCookie(response: NextResponseLike, username: string) {
  const token = jwt.sign({ username }, getSessionSecret(), { expiresIn: SESSION_MAX_AGE_SECONDS });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

type NextResponseLike = {
  cookies: {
    set: (name: string, value: string, options: Record<string, unknown>) => void;
  };
};

export { SESSION_COOKIE };
