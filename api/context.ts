import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "../db/schema";
import { db } from "../db/connection";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import * as cookie from "cookie";
import { verifyToken } from "./lib/auth";
import { Session } from "../contracts/constants";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

function extractToken(req: Request): string | undefined {
  // Authorization header
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  // Session cookie
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const parsed = cookie.parse(cookieHeader);
    const token = parsed[Session.cookieName];
    if (token) return token;
  }

  return undefined;
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const token = extractToken(opts.req);
  let user: User | undefined;

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });
      if (dbUser && dbUser.status === "active") {
        user = dbUser;
      }
    }
  }

  return {
    req: opts.req,
    resHeaders: opts.resHeaders,
    user,
  };
}
