import type { ComponentType, LazyExoticComponent } from 'react';
import { lazy } from 'react';

export type AppCategory =
  | 'crm'
  | 'productividad'
  | 'utilidades'
  | 'herramientas'
  | 'sistema';

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
  category: AppCategory;
  component: LazyExoticComponent<ComponentType>;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  resizable: boolean;
  singleInstance: boolean;
}

// Category display names
export const categoryLabels: Record<AppCategory | 'todas', string> = {
  todas: 'Todas',
  crm: 'CRM',
  productividad: 'Productividad',
  utilidades: 'Utilidades',
  herramientas: 'Herramientas',
  sistema: 'Sistema',
};

// Category colors for app icons
export const categoryColors: Record<AppCategory, string> = {
  crm: '#d4a853',
  productividad: '#3b82f6',
  utilidades: '#6b7280',
  herramientas: '#22c55e',
  sistema: '#64748b',
};

// Helper to create lazy imports
function appLoader(path: string) {
  return lazy(() => import(`@/apps/${path}/index.tsx`));
}

export const appRegistry: AppDefinition[] = [
  // ========== CRM ==========
  {
    id: 'crm_dashboard',
    name: 'CRM Panel',
    icon: 'LayoutDashboard',
    category: 'crm',
    component: appLoader('crm_dashboard'),
    defaultWidth: 1200,
    defaultHeight: 750,
    minWidth: 900,
    minHeight: 600,
    resizable: true,
    singleInstance: true,
  },
  {
    id: 'crm_leads',
    name: 'CRM Leads',
    icon: 'Users',
    category: 'crm',
    component: appLoader('crm_leads'),
    defaultWidth: 1200,
    defaultHeight: 750,
    minWidth: 900,
    minHeight: 600,
    resizable: true,
    singleInstance: true,
  },
  {
    id: 'crm_knowledge',
    name: 'CRM Conocimiento',
    icon: 'BookOpen',
    category: 'crm',
    component: appLoader('crm_knowledge'),
    defaultWidth: 1000,
    defaultHeight: 700,
    minWidth: 800,
    minHeight: 500,
    resizable: true,
    singleInstance: true,
  },
  {
    id: 'crm_settings',
    name: 'CRM Ajustes',
    icon: 'Cog',
    category: 'crm',
    component: appLoader('crm_settings'),
    defaultWidth: 900,
    defaultHeight: 650,
    minWidth: 700,
    minHeight: 500,
    resizable: true,
    singleInstance: true,
  },
  {
    id: 'phone_lookup',
    name: 'Buscar por Teléfono',
    icon: 'Phone',
    category: 'crm',
    component: appLoader('phone_lookup'),
    defaultWidth: 900,
    defaultHeight: 700,
    minWidth: 600,
    minHeight: 500,
    resizable: true,
    singleInstance: true,
  },
  {
    id: 'deep_drive_analysis',
    name: 'Análisis Profundo IA',
    icon: 'BrainCircuit',
    category: 'crm',
    component: appLoader('deep_drive_analysis'),
    defaultWidth: 1100,
    defaultHeight: 750,
    minWidth: 800,
    minHeight: 550,
    resizable: true,
    singleInstance: true,
  },
  {
    id: 'drive_sync',
    name: 'Drive Sync IA',
    icon: 'Cloud',
    category: 'crm',
    component: appLoader('drive_sync'),
    defaultWidth: 1100,
    defaultHeight: 750,
    minWidth: 800,
    minHeight: 550,
    resizable: true,
    singleInstance: true,
  },
  {
    id: 'mortgage_calc',
    name: 'Calculadora Hipotecaria',
    icon: 'Home',
    category: 'crm',
    component: appLoader('mortgage_calc'),
    defaultWidth: 700,
    defaultHeight: 600,
    minWidth: 500,
    minHeight: 400,
    resizable: true,
    singleInstance: true,
  },
  {
    id: 'roi_calc',
    name: 'Calculadora ROI',
    icon: 'TrendingUp',
    category: 'crm',
    component: appLoader('roi_calc'),
    defaultWidth: 700,
    defaultHeight: 600,
    minWidth: 500,
    minHeight: 400,
    resizable: true,
    singleInstance: true,
  },

  // ========== HERRAMIENTAS ==========
  {
    id: 'document_import',
    name: 'Importar Documentos',
    icon: 'FileUp',
    category: 'herramientas',
    component: appLoader('document_import'),
    defaultWidth: 800,
    defaultHeight: 650,
    minWidth: 600,
    minHeight: 450,
    resizable: true,
    singleInstance: true,
  },
];

// Helper functions
export function getAppById(id: string): AppDefinition | undefined {
  return appRegistry.find((app) => app.id === id);
}

export function getAppsByCategory(category: AppCategory | 'todas'): AppDefinition[] {
  if (category === 'todas') return appRegistry;
  return appRegistry.filter((app) => app.category === category);
}

export function searchApps(query: string): AppDefinition[] {
  const q = query.toLowerCase().trim();
  if (!q) return appRegistry;
  return appRegistry.filter(
    (app) =>
      app.name.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q)
  );
}

// Icon mapping for dynamic lucide icon rendering
export const iconMapping: Record<string, string> = {
  Activity: 'Activity',
  ArrowRightLeft: 'ArrowRightLeft',
  AudioLines: 'AudioLines',
  BarChart3: 'BarChart3',
  Binary: 'Binary',
  BookOpen: 'BookOpen',
  Brain: 'Brain',
  BrainCircuit: 'BrainCircuit',
  Building2: 'Building2',
  Calculator: 'Calculator',
  Calendar: 'Calendar',
  Clock: 'Clock',
  Cloud: 'Cloud',
  Cog: 'Cog',
  Columns: 'Columns',
  Contact: 'Contact',
  DollarSign: 'DollarSign',
  FileText: 'FileText',
  FileType: 'FileType',
  FileUp: 'FileUp',
  Flame: 'Flame',
  FolderOpen: 'FolderOpen',
  GitBranch: 'GitBranch',
  Home: 'Home',
  Key: 'Key',
  KeyRound: 'KeyRound',
  LayoutDashboard: 'LayoutDashboard',
  Mail: 'Mail',
  Phone: 'Phone',
  Pin: 'Pin',
  Settings: 'Settings',
  StickyNote: 'StickyNote',
  Terminal: 'Terminal',
  TrendingUp: 'TrendingUp',
  Users: 'Users'
};
