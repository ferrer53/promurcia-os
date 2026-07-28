import * as cookie from "cookie";
import { z } from "zod";
import { Session } from "../contracts/constants";
import { serializeSessionCookie } from "./lib/cookies";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { authenticateUser, signToken } from "./lib/auth";

export const authRouter = createRouter({
  login: publicQuery
    .input(z.object({ username: z.string().min(1), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const user = await authenticateUser(input.username, input.password);
      if (!user) {
        return { success: false, error: "Usuario o contraseña incorrectos" } as const;
      }
      const token = signToken(user);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, serializeSessionCookie(ctx.req.headers, { maxAge: 7 * 24 * 60 * 60 })),
      );
      return { success: true, user, token } as const;
    }),

  me: authedQuery.query((opts) => opts.ctx.user),

  logout: authedQuery.mutation(async ({ ctx }) => {
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", serializeSessionCookie(ctx.req.headers, { maxAge: 0 })),
    );
    return { success: true };
  }),
});
