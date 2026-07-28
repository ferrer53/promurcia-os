import type { Lead as DbLead, Property as DbProperty } from "../../../db/schema";

export type Lead = DbLead;
export type Property = DbProperty;

export const sourceColors: Record<string, string> = {
  idealista: '#e11d48',
  fotocasa: '#f97316',
  'pisos.com': '#8b5cf6',
  email: '#3b82f6',
  whatsapp: '#22c55e',
  webhook: '#06b6d4',
  manual: '#6b7280',
  web: '#14b8a6',
};

export const estadoColors: Record<string, { bg: string; text: string }> = {
  nuevo: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
  contactado: { bg: 'rgba(6,182,212,0.15)', text: '#06b6d4' },
  calificado: { bg: 'rgba(139,92,246,0.15)', text: '#8b5cf6' },
  en_seguimiento: { bg: 'rgba(212,168,83,0.15)', text: '#d4a853' },
  convertido: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  descartado: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
};

export const tierColors: Record<string, { bg: string; text: string }> = {
  hot: { bg: '#fee2e2', text: '#ef4444' },
  warm: { bg: '#fef3c7', text: '#f59e0b' },
  cold: { bg: '#dbeafe', text: '#3b82f6' },
};

export const mockLeads: Lead[] = [];
