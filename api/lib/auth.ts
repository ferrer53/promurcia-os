import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../../db/connection";
import { users, authCredentials } from "../../db/schema";
import { eq, or, like } from "drizzle-orm";
import type { User } from "../../db/schema";

const SALT_ROUNDS = 10;

export type AuthTokenPayload = {
  userId: number;
  role: string;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET no configurado");
    }
    console.warn("[auth] SESSION_SECRET no configurado; usando secreto de desarrollo INSEGURO");
    return "__dev_secret_change_in_production__";
  }
  return secret;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(user: User): string {
  const payload: AuthTokenPayload = { userId: user.id, role: user.role };
  return jwt.sign(payload, getSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const normalized = username.trim().toLowerCase();
  const user = await db.query.users.findFirst({
    where: or(
      like(users.email ?? "", normalized),
      like(users.name ?? "", username.trim())
    ),
  });
  return user ?? null;
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const user = await findUserByUsername(username);
  if (!user) return null;
  const cred = await db.query.authCredentials.findFirst({
    where: eq(authCredentials.userId, user.id),
  });
  if (!cred) return null;
  const ok = await verifyPassword(password, cred.passwordHash);
  return ok ? user : null;
}

export async function setUserPassword(userId: number, plain: string): Promise<void> {
  const hash = await hashPassword(plain);
  await db
    .insert(authCredentials)
    .values({ userId, passwordHash: hash })
    .onConflictDoUpdate({
      target: authCredentials.userId,
      set: { passwordHash: hash, updatedAt: new Date() },
    });
}
