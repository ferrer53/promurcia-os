import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./router";
import { createContext } from "./context";

const app = new Hono();

// CORS
app.use("*", cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  allowHeaders: ["Content-Type", "Authorization", "x-user-role"],
  credentials: true,
}));

// Health check
app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

// tRPC endpoint
app.use("/trpc/*", trpcServer({
  router: appRouter,
  createContext,
}));

// Also mount tRPC at root for compatibility
app.use("/*", trpcServer({
  router: appRouter,
  createContext,
}));

export default app;

// Start server if run directly
if (import.meta.main) {
  const port = Number(process.env.PORT || 3001);
  const { serve } = await import("@hono/node-server");
  serve({ fetch: app.fetch, port });
  console.log(`[Cerebro Promurcia API] Server running on http://localhost:${port}`);
}
