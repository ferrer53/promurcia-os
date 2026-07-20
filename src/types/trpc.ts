/**
 * Type definitions for the tRPC AppRouter.
 * These mirror the backend router definitions at api/src/routers.
 */

export interface Lead {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  estado: 'nuevo' | 'contactado' | 'cualificado' | 'reserva' | 'vendido' | 'perdido';
  fuente: string;
  tier: 'hot' | 'warm' | 'cold';
  score: number;
  fecha: string;
  tipoOperacion: string;
  zona: string;
  persona: string;
  notas: string;
  interacciones: Interaccion[];
  propiedadesVinculadas: PropiedadVinculada[];
  assignedTo?: string;
}

export interface Interaccion {
  id: number;
  tipo: 'email' | 'llamada' | 'whatsapp' | 'visita' | 'nota' | 'sistema' | 'web';
  direccion: 'entrante' | 'saliente';
  asunto: string;
  contenido: string;
  fecha: string;
}

export interface PropiedadVinculada {
  id: number;
  ref: string;
  titulo: string;
  direccion: string;
  relacion: 'propietario' | 'interesado';
}

export interface Property {
  id: number;
  ref: string;
  titulo: string;
  direccion: string;
  zona: string;
  tipo: string;
  estado: 'disponible' | 'reservado' | 'vendido' | 'alquilado';
  operacion: 'venta' | 'alquiler' | 'ambos';
  precio: number;
  precioAlquiler?: number;
  habitaciones: number;
  banos: number;
  superficie: number;
  propietario: string;
  telefono: string;
  email: string;
  notas: string;
  descripcion: string;
  fecha: string;
  leadInteresados: LeadInteresado[];
}

export interface LeadInteresado {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  tier: string;
}

export interface Operation {
  id: string;
  leadName: string;
  propertyRef: string;
  propertyAddress: string;
  amount: number;
  commission: number;
  responsible: string;
  type: 'venta' | 'alquiler';
  stageIndex: number;
  daysInStage: number;
  tier: 'hot' | 'warm' | 'cold';
  documents: { name: string; completed: boolean }[];
  autoTasks: { name: string; status: 'pendiente' | 'completada' }[];
  timeline: { stage: string; date: string; completed: boolean }[];
  notes: string;
  createdAt: string;
}

export interface PipelineStage {
  name: string;
  color: string;
  slaDays: number;
  count: number;
  operations: Operation[];
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pendiente' | 'en_progreso' | 'completada';
  priority: 'alta' | 'media' | 'baja';
  dueDate: string;
  leadId?: number;
  assignedTo: string;
  createdAt: string;
}

export interface Interaction {
  id: number;
  leadId: number;
  tipo: string;
  direccion: 'entrante' | 'saliente';
  asunto: string;
  contenido: string;
  fecha: string;
  userId?: string;
}

export interface KPIData {
  totalLeads: number;
  leadsNuevosHoy: number;
  propiedadesActivas: number;
  operacionesActivas: number;
  tasaConversion: number;
  totalLeadsChange: string;
  leadsNuevosChange: string;
  propiedadesChange: string;
  operacionesChange: string;
  tasaConversionChange: string;
}

export interface LeadStats {
  monthlyData: { month: string; leads: number }[];
  sourceData: { source: string; count: number; color: string }[];
  tierDistribution: {
    hot: { count: number; percentage: number };
    warm: { count: number; percentage: number };
    cold: { count: number; percentage: number };
  };
}

export interface PipelineStats {
  stages: { stage: string; count: number; color: string }[];
  totalValue: number;
}

export interface ActivityItem {
  id: number;
  type: string;
  text: string;
  time: string;
  icon?: string;
  color?: string;
}

export interface AlertItem {
  id: number;
  priority: 'alta' | 'media' | 'baja';
  text: string;
  due: string;
}

export interface Article {
  id: string;
  title: string;
  category: string;
  summary: string;
  content?: string;
  author: string;
  date: string;
  views: number;
}

export interface Setting {
  id: string;
  key: string;
  value: boolean | string | number;
  label: string;
  description: string;
  category: string;
}

export interface ChatMessage {
  id: number;
  role: 'ai' | 'user';
  text: string;
  time: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export interface Documento {
  id: number;
  name: string;
  type: string;
  size: string;
  url: string;
  operationId?: string;
  leadId?: number;
  uploadedAt: string;
}

export interface Reservation {
  id: number;
  propertyId: number;
  propertyRef: string;
  leadId: number;
  leadName: string;
  amount: number;
  status: 'pendiente' | 'confirmada' | 'cancelada';
  createdAt: string;
  expiresAt: string;
}

export interface Offer {
  id: number;
  propertyId: number;
  leadId: number;
  amount: number;
  status: string;
  createdAt: string;
}

export interface Prequalification {
  id: number;
  leadId: number;
  leadName: string;
  maxBudget: number;
  monthlyIncome: number;
  status: string;
  createdAt: string;
}

export interface Visit {
  id: number;
  propertyId: number;
  leadId: number;
  date: string;
  status: string;
  notes: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
