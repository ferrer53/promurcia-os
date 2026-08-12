import { sql, and, gte, lt, eq } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { leads, properties, operations, tasks, interactions, alerts } from "../../db/schema";

const TIER_COLORS: Record<string, string> = {
  hot: "#ef4444",
  warm: "#f59e0b",
  cold: "#3b82f6",
};

const SOURCE_COLORS: Record<string, string> = {
  idealista: "#e11d48",
  fotocasa: "#f97316",
  "pisos.com": "#8b5cf6",
  email: "#3b82f6",
  whatsapp: "#22c55e",
  webhook: "#06b6d4",
  manual: "#6b7280",
  web: "#14b8a6",
  phone: "#f59e0b",
  referral: "#a855f7",
  import: "#d4a853",
};

export const dashboardRouter = createTRPCRouter({
  getKPIs: readOnlyProcedure.query(async () => {
    const [leadCount] = await db.select({ count: sql<number>`count(*)` }).from(leads);
    const [propertyCount] = await db.select({ count: sql<number>`count(*)` }).from(properties);
    const [activePropertyCount] = await db.select({ count: sql<number>`count(*)` }).from(properties).where(sql`${properties.status} = 'disponible'`);
    const [operationCount] = await db.select({ count: sql<number>`count(*)` }).from(operations);
    const [activeOpCount] = await db.select({ count: sql<number>`count(*)` }).from(operations).where(sql`${operations.status} = 'activa'`);
    const [taskCount] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(sql`${tasks.status} IN ('pending', 'in_progress')`);
    const [alertCount] = await db.select({ count: sql<number>`count(*)` }).from(alerts).where(eq(alerts.read, false));
    const revenueResult = await db.select({ total: sql<number>`COALESCE(SUM(${operations.finalValue}), 0)` }).from(operations).where(eq(operations.isSuccess, true));

    // Leads created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [leadsToday] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(gte(leads.createdAt, today));

    // Conversion rate: converted leads / total leads
    const [convertedLeads] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(sql`${leads.status} = 'convertido'`);
    const totalLeadsCount = leadCount?.count ?? 0;
    const tasaConversion = totalLeadsCount > 0 ? Math.round(((convertedLeads?.count ?? 0) / totalLeadsCount) * 100) : 0;

    return {
      totalLeads: totalLeadsCount,
      totalLeadsChange: 0,
      leadsNuevosHoy: leadsToday?.count ?? 0,
      leadsNuevosChange: 0,
      propiedadesActivas: activePropertyCount?.count ?? 0,
      propiedadesChange: 0,
      operacionesActivas: activeOpCount?.count ?? 0,
      operacionesChange: 0,
      tasaConversion,
      tasaConversionChange: 0,
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

    // Monthly data for the last 6 months
    const months: { month: string; leads: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      const start = d.getTime() / 1000;
      const nextMonth = new Date(d);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const end = nextMonth.getTime() / 1000;
      const [count] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(and(gte(leads.createdAt, new Date(start * 1000)), lt(leads.createdAt, new Date(end * 1000))));
      months.push({ month: d.toLocaleDateString("es-ES", { month: "short" }), leads: count?.count ?? 0 });
    }

    const totalLeads = byTier.reduce((sum, t) => sum + t.count, 0);
    const tierDistribution: Record<string, { count: number; percentage: number }> = {
      hot: { count: 0, percentage: 0 },
      warm: { count: 0, percentage: 0 },
      cold: { count: 0, percentage: 0 },
    };
    for (const t of byTier) {
      const key = t.tier || "cold";
      tierDistribution[key] = {
        count: t.count,
        percentage: totalLeads > 0 ? Math.round((t.count / totalLeads) * 100) : 0,
      };
    }

    return {
      bySource,
      byTier,
      byStatus,
      monthlyData: months,
      sourceData: bySource.map((s) => ({
        source: s.source || "desconocido",
        count: s.count,
        color: SOURCE_COLORS[s.source || "manual"] || "#6b7280",
      })),
      tierDistribution,
    };
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

    const STAGE_COLORS = ["#d4a853", "#3b82f6", "#22c55e", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

    return {
      byStage,
      byType,
      stages: byStage.map((s, i) => ({
        stage: s.stage || "sin-etapa",
        count: s.count,
        color: STAGE_COLORS[i % STAGE_COLORS.length],
      })),
    };
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

    const activity = [
      ...recentLeads.map((l) => ({
        id: `lead-${l.id}`,
        type: "lead_creado",
        text: `Nuevo lead: ${l.name}`,
        time: l.createdAt ? new Date(l.createdAt).toLocaleString("es-ES") : "",
        color: "#d4a853",
      })),
      ...recentInteractions.map((i) => ({
        id: `interaction-${i.id}`,
        type: i.type || "nota",
        text: `${i.type || "Interaccion"} con lead #${i.leadId}`,
        time: i.createdAt ? new Date(i.createdAt).toLocaleString("es-ES") : "",
        color: "#3b82f6",
      })),
      ...recentTasks.map((t) => ({
        id: `task-${t.id}`,
        type: "tarea",
        text: `Tarea: ${t.title}`,
        time: t.createdAt ? new Date(t.createdAt).toLocaleString("es-ES") : "",
        color: "#f59e0b",
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

    return { recentLeads, recentInteractions, recentTasks, activity };
  }),

  getAlerts: readOnlyProcedure.query(async () => {
    const [critical] = await db.select({ count: sql<number>`count(*)` }).from(alerts)
      .where(and(eq(alerts.severity, 'critical'), eq(alerts.read, false)));
    const [warning] = await db.select({ count: sql<number>`count(*)` }).from(alerts)
      .where(and(eq(alerts.severity, 'warning'), eq(alerts.read, false)));
    const [info] = await db.select({ count: sql<number>`count(*)` }).from(alerts)
      .where(and(eq(alerts.severity, 'info'), eq(alerts.read, false)));

    const unreadAlerts = await db.query.alerts.findMany({
      where: eq(alerts.read, false),
      orderBy: (a, { desc }) => [desc(a.createdAt)],
      limit: 5,
    });

    return {
      critical: critical?.count ?? 0,
      warning: warning?.count ?? 0,
      info: info?.count ?? 0,
      total: (critical?.count ?? 0) + (warning?.count ?? 0) + (info?.count ?? 0),
      items: unreadAlerts.map((a) => ({
        id: a.id,
        priority: a.severity === "critical" ? "alta" : a.severity === "warning" ? "media" : "baja",
        text: a.title,
        due: a.createdAt ? new Date(a.createdAt).toLocaleDateString("es-ES") : "",
      })),
    };
  }),
});
