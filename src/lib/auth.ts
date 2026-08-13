import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

// SECURITY: Require JWT_SECRET from environment — no fallback
const jwtSecretValue = process.env.JWT_SECRET;
if (!jwtSecretValue) {
  throw new Error(
    "FATAL: JWT_SECRET environment variable is not set. Set it in .env.local before starting the server."
  );
}
const JWT_SECRET = new TextEncoder().encode(jwtSecretValue);

export const COOKIE_NAME = "moon_session";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "employee";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: UserSession): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as "admin" | "manager" | "employee",
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours (matches JWT expiry)
  });
}

export async function removeSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

// --- Validation Helpers ---

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

const VALID_STATUSES = ["todo", "in_progress", "review", "done"] as const;
const VALID_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const VALID_ROLES = ["admin", "manager", "employee"] as const;

export function isValidStatus(s: string): s is (typeof VALID_STATUSES)[number] {
  return (VALID_STATUSES as readonly string[]).includes(s);
}

export function isValidPriority(p: string): p is (typeof VALID_PRIORITIES)[number] {
  return (VALID_PRIORITIES as readonly string[]).includes(p);
}

export function isValidRole(r: string): r is (typeof VALID_ROLES)[number] {
  return (VALID_ROLES as readonly string[]).includes(r);
}

// Max input lengths
export const MAX_TITLE_LENGTH = 500;
export const MAX_DESCRIPTION_LENGTH = 10000;
export const MAX_COMMENT_LENGTH = 5000;
export const MAX_MESSAGE_LENGTH = 5000;
export const MAX_URL_LENGTH = 2048;
