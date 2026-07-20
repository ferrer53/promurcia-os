import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "../context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// ── Auth middleware ──
const requireAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "No autenticado. Inicie sesion para continuar.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// ── Role-based middleware builders ──
function requireRole(roles: string[]) {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No autenticado. Inicie sesion para continuar.",
      });
    }
    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No tiene permisos para realizar esta accion.",
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

// ── Procedure variants ──
export const authedProcedure = t.procedure.use(requireAuth);
export const adminProcedure = t.procedure.use(requireRole(["superCEO", "admin"]));
export const superCEOProcedure = t.procedure.use(requireRole(["superCEO"]));
export const comercialProcedure = t.procedure.use(
  requireRole(["superCEO", "admin", "operaciones", "comercial", "agente"])
);
export const readOnlyProcedure = t.procedure.use(
  requireRole(["superCEO", "admin", "operaciones", "comercial", "agente", "solo_lectura"])
);
