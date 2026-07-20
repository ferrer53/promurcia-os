export interface Property {
  id: number;
  ref: string;
  titulo: string;
  direccion: string;
  zona: string;
  municipio: string;
  provincia: string;
  tipo: string;
  operacion: 'venta' | 'alquiler' | 'ambos';
  precio?: number;
  precioAlquiler?: number;
  habitaciones: number;
  banos: number;
  m2: number;
  parcela?: number;
  estado: 'disponible' | 'reservado' | 'vendido' | 'alquilado';
  propietario: string;
  telefonoPropietario: string;
  emailPropietario: string;
  descripcion: string;
  caracteristicas: string[];
  certificadoConsumo: string;
  certificadoEmisiones: string;
  fecha: string;
  imagenes: string[];
  leadsInteresados: LeadInteresado[];
}

export interface LeadInteresado {
  id: number;
  nombre: string;
  telefono: string;
  tier: string;
  fecha: string;
}

export const estadoPropColors: Record<string, { bg: string; text: string }> = {
  disponible: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  reservado: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  vendido: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  alquilado: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
};

export const tipoColors: Record<string, { bg: string; text: string }> = {
  piso: { bg: 'rgba(139,92,246,0.15)', text: '#8b5cf6' },
  casa: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  local: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  terreno: { bg: 'rgba(100,116,139,0.15)', text: '#64748b' },
  oficina: { bg: 'rgba(6,182,212,0.15)', text: '#06b6d4' },
  chalet: { bg: 'rgba(212,168,83,0.15)', text: '#d4a853' },
  duplex: { bg: 'rgba(232,121,249,0.15)', text: '#e879f9' },
};

export const mockProperties: Property[] = [];
