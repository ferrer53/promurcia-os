import type { CookieOptions } from "hono/utils/cookie";
import type { SerializeOptions } from "cookie";

function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const localhost = isLocalhost(headers);

  return {
    httpOnly: true,
    path: "/",
    sameSite: localhost ? "Lax" : "None",
    secure: !localhost,
  };
}

export function serializeSessionCookie(
  headers: Headers,
  overrides?: SerializeOptions,
): SerializeOptions {
  const opts = getSessionCookieOptions(headers);
  const result: SerializeOptions = {
    httpOnly: opts.httpOnly,
    path: opts.path,
    sameSite: opts.sameSite?.toLowerCase() as "lax" | "none" | "strict",
    secure: opts.secure,
    ...overrides,
  };
  if (!result.secure) {
    delete result.sameSite;
  }
  return result;
}
