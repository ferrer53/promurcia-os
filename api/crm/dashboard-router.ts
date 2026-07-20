import { sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { leads, properties, operations, tasks, interactions, alerts } from "../../db/schema";

export const dashboardRouter = createTRPCRouter({
  getKPIs: readOnlyProcedure.query(async () => {
    const [leadCount] = await db.select({ count: sql<number>`count(*)` }).from(leads);
    const [propertyCount] = await db.select({ count: sql<number>`count(*)` }).from(properties);
    const [operationCount] = await db.select({ count: sql<number>`count(*)` }).from(operations);
    const [activeOpCount] = await db.select({ count: sql<number>`count(*)` }).from(operations).where(sql`${operations.status} = 'activa'`);
    const [taskCount] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(sql`${tasks.status} IN ('pending', 'in_progress')`);
    const [alertCount] = await db.select({ count: sql<number>`count(*)` }).from(alerts).where(sql`${alerts.read} = 0`);
    const revenueResult = await db.select({ total: sql<number>`COALESCE(SUM(${operations.finalValue}), 0)` }).from(operations).where(sql`${operations.isSuccess} = 1`);

    return {
      totalLeads: leadCount?.count ?? 0,
      totalProperties: propertyCount?.count ?? 0,
      totalOperations: operationCount?.count ?? 0,
      activeOperations: activeOpCount?.count ?? 0,
      pendingTasks: taskCount?.count ?? 0,
      unreadAlerts: alertCount?.count ?? 0,
      totalRevenue: revenueResult[0]?.total ?? 0,
    };
  }),

  getLeadStats: readOnlyProcedure.query(async () => {
    const bySource = await db.select({
      source: leads.source,
      count: sql<number>`count(*)`,
    }).from(leads).groupBy(leads.source);

    const byTier = await db.select({
      tier: leads.tier,
      count: sql<number>`count(*)`,
    }).from(leads).groupBy(leads.tier);

    const byStatus = await db.select({
      status: leads.status,
      count: sql<number>`count(*)`,
    }).from(leads).groupBy(leads.status);

    return { bySource, byTier, byStatus };
  }),

  getPipelineStats: readOnlyProcedure.query(async () => {
    const byStage = await db.select({
      stage: operations.stage,
      count: sql<number>`count(*)`,
    }).from(operations)
      .where(sql`${operations.status} = 'activa'`)
      .groupBy(operations.stage);

    const byType = await db.select({
      type: operations.type,
      count: sql<number>`count(*)`,
    }).from(operations).groupBy(operations.type);

    return { byStage, byType };
  }),

  getRecentActivity: readOnlyProcedure.query(async () => {
    const recentLeads = await db.query.leads.findMany({
      limit: 5,
      orderBy: (l, { desc }) => [desc(l.createdAt)],
    });

    const recentInteractions = await db.query.interactions.findMany({
      limit: 5,
      orderBy: (i, { desc }) => [desc(i.createdAt)],
    });

    const recentTasks = await db.query.tasks.findMany({
      limit: 5,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      where: (t) => sql`${t.status} IN ('pending', 'in_progress')`,
    });

    return { recentLeads, recentInteractions, recentTasks };
  }),

  getAlerts: readOnlyProcedure.query(async () => {
    const [critical] = await db.select({ count: sql<number>`count(*)` }).from(alerts)
      .where(sql`${alerts.severity} = 'critical' AND ${alerts.read} = 0`);
    const [warning] = await db.select({ count: sql<number>`count(*)` }).from(alerts)
      .where(sql`${alerts.severity} = 'warning' AND ${alerts.read} = 0`);
    const [info] = await db.select({ count: sql<number>`count(*)` }).from(alerts)
      .where(sql`${alerts.severity} = 'info' AND ${alerts.read} = 0`);

    return {
      critical: critical?.count ?? 0,
      warning: warning?.count ?? 0,
      info: info?.count ?? 0,
      total: (critical?.count ?? 0) + (warning?.count ?? 0) + (info?.count ?? 0),
    };
  }),
});
