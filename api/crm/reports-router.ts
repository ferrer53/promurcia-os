import { z } from "zod";
import { sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { leads, properties, operations, tasks, interactions } from "../../db/schema";

export const reportsRouter = createTRPCRouter({
  getConversionFunnel: readOnlyProcedure.query(async () => {
    const byStage = await db.select({
      stage: leads.status,
      count: sql<number>`count(*)`,
    }).from(leads).groupBy(leads.status);
    return { byStage };
  }),

  getRevenueByMonth: readOnlyProcedure.query(async () => {
    const result = await db.select({
      month: sql<string>`strftime('%Y-%m', ${operations.closeDate}, 'unixepoch')`,
      total: sql<number>`COALESCE(SUM(${operations.finalValue}), 0)`,
      count: sql<number>`count(*)`,
    }).from(operations)
      .where(sql`${operations.isSuccess} = 1`)
      .groupBy(sql`strftime('%Y-%m', ${operations.closeDate}, 'unixepoch')`);
    return result;
  }),

  getAgentPerformance: readOnlyProcedure.query(async () => {
    const result = await db.select({
      agentId: operations.agentId,
      totalOps: sql<number>`count(*)`,
      closedSuccess: sql<number>`SUM(CASE WHEN ${operations.isSuccess} = 1 THEN 1 ELSE 0 END)`,
      totalRevenue: sql<number>`COALESCE(SUM(${operations.finalValue}), 0)`,
    }).from(operations)
      .groupBy(operations.agentId);
    return result;
  }),

  getPropertyStats: readOnlyProcedure.query(async () => {
    const byType = await db.select({
      type: properties.type,
      count: sql<number>`count(*)`,
    }).from(properties).groupBy(properties.type);

    const byStatus = await db.select({
      status: properties.status,
      count: sql<number>`count(*)`,
    }).from(properties).groupBy(properties.status);

    const avgPrice = await db.select({
      avgPrice: sql<number>`COALESCE(AVG(${properties.price}), 0)`,
    }).from(properties);

    return { byType, byStatus, avgPrice: avgPrice[0]?.avgPrice ?? 0 };
  }),
});
