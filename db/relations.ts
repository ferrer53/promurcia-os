import { relations } from "drizzle-orm";
import {
  leads,
  properties,
  leadProperties,
  tasks,
  operations,
  operationTimeline,
  operationChecklist,
  interactions,
  visits,
  offers,
  reservations,
  documents,
  alerts,
  prequalifications,
  cerebroSessions,
  cerebroMessages,
  users,
} from "./schema";

// ── Leads ────────────────────────────────────
export const leadsRelations = relations(leads, ({ many, one }) => ({
  assignedUser: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
  }),
  linkedProperties: many(leadProperties),
  tasks: many(tasks),
  interactions: many(interactions),
  visits: many(visits),
  offers: many(offers),
  prequalifications: many(prequalifications),
}));

// ── Properties ───────────────────────────────
export const propertiesRelations = relations(properties, ({ many }) => ({
  linkedLeads: many(leadProperties),
  tasks: many(tasks),
  interactions: many(interactions),
  visits: many(visits),
  offers: many(offers),
  reservations: many(reservations),
}));

// ── Lead-Property links ──────────────────────
export const leadPropertiesRelations = relations(leadProperties, ({ one }) => ({
  lead: one(leads, {
    fields: [leadProperties.leadId],
    references: [leads.id],
  }),
  property: one(properties, {
    fields: [leadProperties.propertyId],
    references: [properties.id],
  }),
}));

// ── Tasks ────────────────────────────────────
export const tasksRelations = relations(tasks, ({ one }) => ({
  lead: one(leads, {
    fields: [tasks.leadId],
    references: [leads.id],
  }),
  property: one(properties, {
    fields: [tasks.propertyId],
    references: [properties.id],
  }),
}));

// ── Operations ───────────────────────────────
export const operationsRelations = relations(operations, ({ many, one }) => ({
  lead: one(leads, {
    fields: [operations.leadId],
    references: [leads.id],
  }),
  timeline: many(operationTimeline),
  checklist: many(operationChecklist),
}));

// ── Interactions ─────────────────────────────
export const interactionsRelations = relations(interactions, ({ one }) => ({
  lead: one(leads, {
    fields: [interactions.leadId],
    references: [leads.id],
  }),
}));

// ── Cerebro ──────────────────────────────────
export const cerebroSessionsRelations = relations(cerebroSessions, ({ many }) => ({
  messages: many(cerebroMessages),
}));
