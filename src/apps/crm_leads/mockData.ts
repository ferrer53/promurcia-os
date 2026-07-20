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
  cualificado: { bg: 'rgba(139,92,246,0.15)', text: '#8b5cf6' },
  reserva: { bg: 'rgba(212,168,83,0.15)', text: '#d4a853' },
  vendido: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  perdido: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
};

export const tierColors: Record<string, { bg: string; text: string }> = {
  hot: { bg: '#fee2e2', text: '#ef4444' },
  warm: { bg: '#fef3c7', text: '#f59e0b' },
  cold: { bg: '#dbeafe', text: '#3b82f6' },
};

export const mockLeads: Lead[] = [];
