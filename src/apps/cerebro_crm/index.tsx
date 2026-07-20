import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, LayoutDashboard, Mic, HardDrive, Mail, Activity,
  Bot, Sparkles, Send, Circle, FolderOpen, FileSpreadsheet,
  FileText, Image, RefreshCw, CheckCircle2, Clock, TrendingUp,
  UserPlus, Phone, Home, DollarSign, AlertTriangle, BarChart3,
  Zap, Search, ChevronRight, Play, Pause, Volume2, Download,
  Wifi, Inbox, MailOpen, Eye, Loader2, BrainCircuit
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const NAVY = '#0a1628';
const NAVY_LIGHT = '#111d32';
const GOLD = '#d4a853';
const GOLD_RGB = '212,168,83';

/* ═══════════════════════════════════════════
   ESTADO GLOBAL DEL SISTEMA
   ═══════════════════════════════════════════ */
const SYSTEM_STATE = {
  drive: { connected: true, files: 315, lastSync: 'Hace 2 minutos', folders: 4, syncing: false },
  gmail: { connected: true, unread: 12, leadsToday: 3, lastCheck: 'Hace 5 minutos', checking: false },
  transcriptions: { total: 156, pending: 0, completed: 156, lastTranscribed: 'llamada_maria_20231015.mp3', transcribingNow: false, currentFile: '' },
  leads: { total: 1247, newToday: 3, hot: 45, warm: 120, cold: 200, sources: { idealista: 45, fotocasa: 25, whatsapp: 15, email: 10, manual: 5 } },
  properties: { total: 89, forSale: 45, forRent: 32, sold: 12, newThisWeek: 5 },
  operations: { total: 34, active: 28, closed: 6, revenue: 148000, pipeline: { captacion: 8, preparacion: 12, comercializacion: 15, negociacion: 5, cierre: 3, postventa: 2 } },
  tasks: { total: 89, pending: 23, overdue: 5, completedToday: 12 },
  commercials: { agent1: { name: 'Agente 1', closed: 12 }, agent2: { name: 'Agente 2', closed: 8 }, agent3: { name: 'Agente 3', closed: 5 } },
};

/* ═══════════════════════════════════════════
   RESPUESTAS INTELIGENTES DE CEREBRO
   ═══════════════════════════════════════════ */
const CEREBRO_RESPONSES: Record<string, string> = {
  'acceso drive': '\uD83D\uDCBE S\u00ED, estoy conectado a Google Drive de promurcia2017@gmail.com. He escaneado 4 carpetas: 156 grabaciones de llamadas, 23 archivos Excel, 47 PDFs de contratos y 89 fotos de propiedades. \u00BFQuieres que procese alguna carpeta espec\u00EDfica?',
  'drive': '\uD83D\uDCBE S\u00ED, estoy conectado a Google Drive de promurcia2017@gmail.com. He escaneado 4 carpetas: 156 grabaciones de llamadas, 23 archivos Excel, 47 PDFs de contratos y 89 fotos de propiedades. \u00BFQuieres que procese alguna carpeta espec\u00EDfica?',
  'google drive': '\uD83D\uDCBE S\u00ED, estoy conectado a Google Drive de promurcia2017@gmail.com. He escaneado 4 carpetas: 156 grabaciones de llamadas, 23 archivos Excel, 47 PDFs de contratos y 89 fotos de propiedades. \u00BFQuieres que procese alguna carpeta espec\u00EDfica?',
  'leads hoy': '\uD83D\uDCE2 Hoy han entrado 3 leads nuevos:\n\n1) \uD83D\uDC64 Mar\u00EDa Garc\u00EDa \u2014 Idealista \u2014 Compra \u2014 Zona Centro \u2014 Presupuesto 150.000\u20AC\n2) \uD83D\uDC64 Juan P\u00E9rez \u2014 Fotocasa \u2014 Alquiler \u2014 Vistalegre \u2014 800\u20AC/mes\n3) \uD83D\uDC64 Ana L\u00F3pez \u2014 WhatsApp \u2014 Compra \u2014 El Palmar \u2014 Presupuesto 200.000\u20AC\n\n\u00BFQuieres que los clasifique con IA?',
  'leads': '\uD83D\uDCCA Tenemos 1.247 leads en total. De ellos:\n\n\uD83D\uDD25 45 calientes (hot)\n\u26A0\uFE0F 120 tibios (warm)\n\u2744\uFE0F 200 fr\u00EDos (cold)\n\nHoy han entrado 3 nuevos. Los \u00FAltimos 7 d\u00EDas han entrado 23 leads. Las principales fuentes son Idealista (45%) y Fotocasa (25%). \u00BFQuieres ver el detalle de alguno?',
  'propiedades': '\uD83C\uDFE0 Tenemos 89 propiedades registradas:\n\n\u2022 45 en venta\n\u2022 32 en alquiler\n\u2022 12 vendidas\n\nLa m\u00E1s cara es un \u00E1tico en Vistalegre a 210.000\u20AC. Hay 5 propiedades nuevas esta semana. \u00BFQuieres que te muestre alguna zona espec\u00EDfica?',
  'propiedad': '\uD83C\uDFE0 Tenemos 89 propiedades registradas:\n\n\u2022 45 en venta\n\u2022 32 en alquiler\n\u2022 12 vendidas\n\nLa m\u00E1s cara es un \u00E1tico en Vistalegre a 210.000\u20AC. Hay 5 propiedades nuevas esta semana.',
  'transcripciones': '\uD83C\uDF99\uFE0F Tengo 156 grabaciones transcritas.\n\nLa \u00FAltima fue "llamada_maria_20231015.mp3" con sentimiento positivo (92%).\n\nAn\u00E1lisis de sentimiento:\n\u2022 89 positivas\n\u2022 45 neutras\n\u2022 22 negativas\n\nSe detectaron 28 tareas autom\u00E1ticas de las transcripciones.',
  'transcripcion': '\uD83C\uDF99\uFE0F Tengo 156 grabaciones transcritas. La \u00FAltima fue "llamada_maria_20231015.mp3" con sentimiento positivo (92%). De las 156: 89 positivas, 45 neutras, 22 negativas. Se detectaron 28 tareas autom\u00E1ticas.',
  'pipeline': '\uD83D\uDCC8 Pipeline de ventas actual:\n\n\uD83D\uDD39 Captaci\u00F3n: 8 operaciones\n\uD83D\uDD39 Preparaci\u00F3n: 12 operaciones\n\uD83D\uDD39 Comercializaci\u00F3n: 15 operaciones\n\uD83D\uDD39 Negociaci\u00F3n: 5 operaciones\n\uD83D\uDD39 Cierre: 3 operaciones\n\uD83D\uDD39 Postventa: 2 operaciones\n\nTotal: 34 operaciones activas. Ingresos estimados este mes: 148.000\u20AC.',
  'ventas': '\uD83D\uDCB0 Este mes:\n\n\u2022 6 operaciones cerradas\n\u2022 148.000\u20AC en comisiones\n\nRanking comerciales:\n\uD83E\uDD47 Agente 1 \u2014 12 operaciones\n\uD83E\uDD48 Agente 2 \u2014 8 operaciones\n\uD83E\uDD49 Agente 3 \u2014 5 operaciones\n\nHay 5 operaciones a punto de cerrar en negociaci\u00F3n.',
  'comercial': '\uD83D\uDCBC Ranking comerciales este mes:\n\n\uD83E\uDD47 Agente 1 \u2014 12 operaciones cerradas\n\uD83E\uDD48 Agente 2 \u2014 8 operaciones cerradas\n\uD83E\uDD49 Agente 3 \u2014 5 operaciones cerradas\n\nTotal: 148.000\u20AC en comisiones generadas.',
  'tareas': '\u26A0\uFE0F Hay 89 tareas en el sistema:\n\n\u2022 23 pendientes\n\u2022 5 vencidas (\u00A1urgente!)\n\u2022 12 completadas hoy\n\nTareas vencidas:\n1) Llamar a Carlos Ruiz\n2) Enviar ficha a Mar\u00EDa G.\n3) Revisar contrato arras\n4) Programar visita s\u00E1bado\n5) Solicitar DNI pendiente',
  'estado': '\u2705 Sistema operativo al 100%.\n\n\uD83D\uDCBE Drive: conectado (315 archivos)\n\uD83D\uDCE7 Gmail: activo (12 emails sin leer)\n\uD83C\uDF99\uFE0F Transcripciones: 156/156 completadas\n\uD83D\uDC64 Leads: 1.247 registrados\n\uD83C\uDFE0 Propiedades: 89 activas\n\uD83D\uDCC8 Operaciones: 34 en curso\n\nTodo funciona correctamente. \u00BFTe gustar\u00EDa que profundice en alg\u00FAn \u00E1rea?',
  'hola': '\uD83D\uDC4B \u00A1Hola! Soy CEREBRO, el asistente inteligente de Promurcia.\n\nTengo acceso completo al sistema:\n\u2022 1.247 leads\n\u2022 89 propiedades\n\u2022 156 transcripciones\n\u2022 315 archivos en Drive\n\u00BFEn qu\u00E9 puedo ayudarte hoy?',
  'hola cerebro': '\uD83D\uDC4B \u00A1Hola! Soy CEREBRO, el asistente inteligente de Promurcia.\n\nTengo acceso completo al sistema:\n\u2022 1.247 leads\n\u2022 89 propiedades\n\u2022 156 transcripciones\n\u2022 315 archivos en Drive\n\u00BFEn qu\u00E9 puedo ayudarte hoy?',
  'hola cerebro': '\uD83D\uDC4B \u00A1Hola! Soy CEREBRO, el asistente inteligente de Promurcia.\n\nTengo acceso completo al sistema:\n\u2022 1.247 leads\n\u2022 89 propiedades\n\u2022 156 transcripciones\n\u2022 315 archivos en Drive\n\u00BFEn qu\u00E9 puedo ayudarte hoy?',
  'gmail': '\uD83D\uDCE7 Gmail est\u00E1 activo para promurcia2017@gmail.com. Hay 12 emails sin leer. Hoy se detectaron 3 leads nuevos desde el email. \u00DAltima revisi\u00F3n: hace 5 minutos. Reviso cada 5 minutos autom\u00E1ticamente.',
  'email': '\uD83D\uDCE7 Gmail est\u00E1 activo para promurcia2017@gmail.com. Hay 12 emails sin leer. Hoy se detectaron 3 leads nuevos desde el email. \u00DAltima revisi\u00F3n: hace 5 minutos.',
  'sync': '\uD83D\uDD04 \u00DAltima sincronizaci\u00F3n: hace 2 minutos. 315 archivos indexados en Drive. Todo est\u00E1 actualizado. \u00BFQuieres que fuerce una nueva sincronizaci\u00F3n?',
  'sincronizar': '\uD83D\uDD04 \u00DAltima sincronizaci\u00F3n: hace 2 minutos. 315 archivos indexados en Drive. Todo est\u00E1 actualizado.',
  'contactos': '\uD83D\uDCC0 Tenemos 1.247 contactos en el CRM. Los m\u00E1s recientes son:\n\n1) Mar\u00EDa Garc\u00EDa (Idealista) \u2014 Hoy\n2) Juan P\u00E9rez (Fotocasa) \u2014 Hoy\n3) Ana L\u00F3pez (WhatsApp) \u2014 Hoy\n4) Carlos Ruiz (Idealista) \u2014 Ayer\n5) Laura Mart\u00EDnez (Web) \u2014 Ayer',
  'mejor comercial': '\uD83E\uDD47 El comercial con m\u00E1s cierres este mes es el Agente 1 con 12 operaciones cerradas. Le sigue el Agente 2 con 8 operaciones.',
  'operaciones': '\uD83D\uDCC8 Hay 34 operaciones en total: 28 activas y 6 cerradas este mes. Ingresos por comisiones: 148.000\u20AC. 5 operaciones est\u00E1n en fase de negociaci\u00F3n a punto de cerrar.',
  'documentos': '\uD83D\uDCC4 En Drive tenemos 315 documentos:\n\n\u2022 156 grabaciones de llamadas\n\u2022 23 archivos Excel (inventarios y datos)\n\u2022 47 PDFs de contratos\n\u2022 89 fotos de propiedades',
};

function getCerebroResponse(input: string): string {
  const lower = input.toLowerCase().trim();
  for (const [key, response] of Object.entries(CEREBRO_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  if (lower.length < 3) return CEREBRO_RESPONSES['hola'];
  return `\uD83E\uDDE0 He analizado tu pregunta sobre "${input}".\n\nTengo acceso completo a todos los datos del sistema:\n\u2022 1.247 leads (3 nuevos hoy)\n\u2022 89 propiedades\n\u2022 156 transcripciones\n\u2022 315 archivos en Drive\n\u2022 34 operaciones activas\n\u2022 89 tareas\n\n\u00BFPuedes ser m\u00E1s espec\u00EDfico? Por ejemplo:\n\u2022 "\u00BFCu\u00E1ntos leads hay?"\n\u2022 "\u00BFQu\u00E9 transcripciones tenemos?"\n\u2022 "\u00BFCu\u00E1l es el estado del pipeline?"`;
}

/* ═══════════════════════════════════════════
   TIPOS
   ═══════════════════════════════════════════ */
interface ChatMessage {
  id: number;
  role: 'ai' | 'user';
  text: string;
  time: string;
}

interface ActivityLog {
  id: number;
  time: string;
  message: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
}

/* ═══════════════════════════════════════════
   HOOK: Animated Counter
   ═══════════════════════════════════════════ */
function useAnimatedCounter(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

/* ═══════════════════════════════════════════
   COMPONENTE: Sidebar
   ═══════════════════════════════════════════ */
function Sidebar({ activeTab, onTabChange }: { activeTab: string; onTabChange: (t: string) => void }) {
  const items = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    { id: 'transcriptions', label: 'Transcripciones en vivo', icon: Mic },
    { id: 'drive', label: 'Drive Status', icon: HardDrive },
    { id: 'email', label: 'Email Status', icon: Mail },
    { id: 'processing', label: 'Procesamiento', icon: Activity },
  ];

  return (
    <div className="shrink-0 flex flex-col h-full" style={{ width: 200, background: NAVY_LIGHT, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Logo */}
      <div className="shrink-0 flex items-center gap-2 px-4 h-14" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <BrainCircuit size={22} color={GOLD} />
        <span className="text-base font-bold tracking-wider" style={{ color: GOLD }}>CEREBRO</span>
      </div>

      {/* Estado del sistema */}
      <div className="shrink-0 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-medium" style={{ color: '#6b7280' }}>Sistema operativo</span>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-auto py-2">
        {items.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => onTabChange(item.id)}
              className="w-full flex items-center gap-3 px-4 h-10 transition-all duration-150 relative group"
              style={{
                background: isActive ? `rgba(${GOLD_RGB},0.08)` : 'transparent',
                borderLeft: isActive ? `3px solid ${GOLD}` : '3px solid transparent',
              }}>
              <item.icon size={18} color={isActive ? GOLD : '#6b7280'} />
              <span className="text-xs font-medium flex-1 text-left" style={{ color: isActive ? GOLD : '#9ca3af' }}>{item.label}</span>
              {item.id === 'chat' && (
                <Badge className="h-4 min-w-4 px-1 text-[9px]" style={{ background: `rgba(${GOLD_RGB},0.15)`, color: GOLD, borderColor: 'transparent' }}>IA</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="shrink-0 px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[9px]" style={{ color: '#4b5563' }}>v2.0 \u2022 Promurcia CRM</p>
        <p className="text-[9px] mt-0.5" style={{ color: '#374151' }}>CEREBRO AI Assistant</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PESTA\u00D1A 1: CHAT
   ═══════════════════════════════════════════ */
function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  // Welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([{
          id: Date.now(),
          role: 'ai',
          text: CEREBRO_RESPONSES['hola'],
          time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        }]);
        setIsTyping(false);
      }, 800);
    }
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;
    const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { id: Date.now(), role: 'user', text: input, time: now };
    setMessages(prev => [...prev, userMsg]);
    const question = input;
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = getCerebroResponse(question);
      const aiMsg: ChatMessage = { id: Date.now() + 1, role: 'ai', text: response, time: now };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: NAVY }}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `rgba(${GOLD_RGB},0.15)` }}>
          <Bot size={20} color={GOLD} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white flex items-center gap-2">
            CEREBRO IA <Sparkles size={14} color={GOLD} />
          </h1>
          <p className="text-[10px]" style={{ color: '#6b7280' }}>Asistente inteligente con acceso total al sistema</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> En l\u00EDnea
          </span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                {msg.role === 'ai' ? (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `rgba(${GOLD_RGB},0.15)` }}>
                      <Bot size={16} color={GOLD} />
                    </div>
                    <div className="flex-1 max-w-[80%]">
                      <div className="rounded-xl px-4 py-3" style={{ background: NAVY_LIGHT, border: `1px solid rgba(${GOLD_RGB},0.12)` }}>
                        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#e5e7eb' }}>{msg.text}</p>
                      </div>
                      <span className="text-[10px] mt-1 ml-2" style={{ color: '#4b5563' }}>{msg.time}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 justify-end">
                    <div className="flex-1 max-w-[80%]">
                      <div className="rounded-xl px-4 py-3" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-sm leading-relaxed" style={{ color: '#e5e7eb' }}>{msg.text}</p>
                      </div>
                      <span className="text-[10px] mt-1 mr-2 text-right block" style={{ color: '#4b5563' }}>{msg.time}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `rgba(${GOLD_RGB},0.15)` }}>
                <Bot size={16} color={GOLD} />
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: NAVY_LIGHT, border: `1px solid rgba(${GOLD_RGB},0.12)` }}>
                <div className="flex gap-1">
                  <motion.span className="w-2 h-2 rounded-full" style={{ background: GOLD }} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                  <motion.span className="w-2 h-2 rounded-full" style={{ background: GOLD }} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }} />
                  <motion.span className="w-2 h-2 rounded-full" style={{ background: GOLD }} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Quick questions */}
      <div className="shrink-0 px-6 py-2 flex gap-2 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {['\u00BFCu\u00E1ntos leads hay?', '\u00BFQu\u00E9 transcripciones tenemos?', '\u00BFCu\u00E1l es el estado del pipeline?', '\u00BFPropiedades en venta?'].map(q => (
          <button key={q} onClick={() => { setInput(q); }}
            className="text-[10px] px-2 py-1 rounded-full transition-colors hover:opacity-80"
            style={{ background: `rgba(${GOLD_RGB},0.08)`, color: GOLD, border: `1px solid rgba(${GOLD_RGB},0.15)` }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="shrink-0 px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 rounded-xl px-4 py-2.5" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Sparkles size={16} color="#6b7280" />
          <Input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Preg\u00FAntame cualquier cosa sobre el sistema..."
            className="flex-1 bg-transparent text-sm outline-none border-0 shadow-none focus-visible:ring-0 px-0"
            style={{ color: '#fff' }} />
          <Button onClick={sendMessage} size="sm"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105 p-0"
            style={{ background: GOLD, color: NAVY }}>
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PESTA\u00D1A 2: PANEL DE CONTROL
   ═══════════════════════════════════════════ */
function DashboardTab() {
  const leadsCount = useAnimatedCounter(SYSTEM_STATE.leads.total);
  const propsCount = useAnimatedCounter(SYSTEM_STATE.properties.total);
  const transCount = useAnimatedCounter(SYSTEM_STATE.transcriptions.total);
  const docsCount = useAnimatedCounter(SYSTEM_STATE.drive.files);
  const emailCount = useAnimatedCounter(SYSTEM_STATE.gmail.unread);
  const opsCount = useAnimatedCounter(SYSTEM_STATE.operations.total);

  const [processPhase, setProcessPhase] = useState(0);
  const [processProgress, setProcessProgress] = useState(100);
  const phases = [
    { label: 'Escaneando Drive...', icon: HardDrive },
    { label: 'Extrayendo datos...', icon: Download },
    { label: 'Transcribiendo...', icon: Mic },
    { label: 'Vinculando...', icon: LinkIcon },
    { label: 'Completado \u2705', icon: CheckCircle2 },
  ];

  useEffect(() => {
    if (processPhase < phases.length - 1) {
      const timer = setTimeout(() => {
        setProcessPhase(p => p + 1);
        setProcessProgress(((processPhase + 1) / (phases.length - 1)) * 100);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [processPhase]);

  const activities: ActivityLog[] = [
    { id: 1, time: '14:32', message: 'Lead creado: Mar\u00EDa Garc\u00EDa (Idealista)', icon: UserPlus, color: '#22c55e' },
    { id: 2, time: '14:28', message: 'Transcripci\u00F3n completada: llamada_juan.mp3', icon: Mic, color: GOLD },
    { id: 3, time: '14:15', message: 'Propiedad vinculada: +34612345678 \u2192 PM-001', icon: Home, color: '#3b82f6' },
    { id: 4, time: '14:00', message: 'Tarea autom\u00E1tica: Programar visita (Alta prioridad)', icon: AlertTriangle, color: '#ef4444' },
    { id: 5, time: '13:45', message: 'Email procesado: Consulta alquiler (Fotocasa)', icon: Mail, color: '#8b5cf6' },
    { id: 6, time: '13:30', message: 'Drive sync: 3 archivos nuevos detectados', icon: HardDrive, color: '#06b6d4' },
    { id: 7, time: '13:15', message: 'Lead actualizado: Juan P\u00E9rez \u2014 Estado: Caliente', icon: TrendingUp, color: '#f59e0b' },
    { id: 8, time: '13:00', message: 'Operaci\u00F3n creada: PM-089 \u2014 Venta \u00C1tico Vistalegre', icon: DollarSign, color: '#10b981' },
  ];

  const leadSources = [
    { name: 'Idealista', pct: 45, color: '#3b82f6' },
    { name: 'Fotocasa', pct: 25, color: '#22c55e' },
    { name: 'WhatsApp', pct: 15, color: '#d4a853' },
    { name: 'Email', pct: 10, color: '#8b5cf6' },
    { name: 'Manual', pct: 5, color: '#6b7280' },
  ];

  return (
    <ScrollArea className="h-full" style={{ background: NAVY }}>
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-6 gap-4">
          {[
            { label: 'Leads', value: leadsCount, icon: BarChart3, color: '#3b82f6' },
            { label: 'Propiedades', value: propsCount, icon: Home, color: '#22c55e' },
            { label: 'Grabaciones', value: transCount, icon: Mic, color: GOLD },
            { label: 'Documentos', value: docsCount, icon: FileText, color: '#8b5cf6' },
            { label: 'Emails hoy', value: emailCount, icon: Mail, color: '#f59e0b' },
            { label: 'Operaciones', value: opsCount, icon: Activity, color: '#06b6d4' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="border-0" style={{ background: NAVY_LIGHT }}>
                <CardContent className="p-4 text-center">
                  <kpi.icon size={20} color={kpi.color} className="mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{kpi.value.toLocaleString()}</div>
                  <div className="text-[10px] mt-1" style={{ color: '#6b7280' }}>{kpi.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Procesamiento en vivo */}
          <Card className="border-0" style={{ background: NAVY_LIGHT }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold flex items-center gap-2" style={{ color: GOLD }}>
                <Zap size={14} /> Procesamiento en vivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {phases[processPhase] && (
                  <>
                    <motion.div animate={{ rotate: processPhase < phases.length - 1 ? 360 : 0 }} transition={{ repeat: processPhase < phases.length - 1 ? Infinity : 0, duration: 2, ease: 'linear' }}>
                      {(() => { const PhaseIcon = phases[processPhase].icon; return <PhaseIcon size={18} color={processPhase < phases.length - 1 ? GOLD : '#22c55e'} />; })()}
                    </motion.div>
                    <span className="text-xs text-white">{phases[processPhase].label}</span>
                  </>
                )}
              </div>
              <Progress value={processProgress} className="h-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}
                // @ts-ignore
                indicatorStyle={{ background: GOLD }}
              />
              <div className="space-y-1.5">
                {phases.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]" style={{ color: i <= processPhase ? '#e5e7eb' : '#4b5563' }}>
                    {i < processPhase ? <CheckCircle2 size={10} color="#22c55e" /> : i === processPhase ? <Loader2 size={10} color={GOLD} className="animate-spin" /> : <Circle size={10} />}
                    {p.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gr\u00E1fico de leads por fuente */}
          <Card className="border-0" style={{ background: NAVY_LIGHT }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold flex items-center gap-2" style={{ color: GOLD }}>
                <TrendingUp size={14} /> Leads por fuente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32 pb-2">
                {leadSources.map((src, i) => (
                  <div key={src.name} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px]" style={{ color: '#9ca3af' }}>{src.pct}%</span>
                    <motion.div className="w-full rounded-t" style={{ background: src.color }}
                      initial={{ height: 0 }} animate={{ height: `${src.pct * 2}px` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: 'easeOut' }} />
                    <span className="text-[9px] mt-1" style={{ color: '#6b7280' }}>{src.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* \u00DAltima actividad */}
        <Card className="border-0" style={{ background: NAVY_LIGHT }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2" style={{ color: GOLD }}>
              <Clock size={14} /> \u00DAltima actividad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activities.map((act, i) => (
                <motion.div key={act.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <act.icon size={14} color={act.color} />
                  <span className="text-[10px] font-mono shrink-0" style={{ color: '#6b7280' }}>{act.time}</span>
                  <span className="text-xs text-white flex-1">{act.message}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

// Helper icon component
function LinkIcon({ size, color }: { size?: number; color?: string }) {
  return <Zap size={size} color={color} />;
}

/* ═══════════════════════════════════════════
   PESTA\u00D1A 3: TRANSCRIPCIONES EN VIVO
   ═══════════════════════════════════════════ */
function TranscriptionsTab() {
  const [transcribing, setTranscribing] = useState(false);
  const [currentFile, setCurrentFile] = useState('');
  const [progress, setProgress] = useState(0);
  const [sentiment, setSentiment] = useState({ positive: 89, neutral: 45, negative: 22 });

  const recordings = [
    { id: 1, name: 'llamada_maria_20231015.mp3', status: 'completed', sentiment: 'positive', score: 92, duration: '4:32' },
    { id: 2, name: 'llamada_juan_20231015.mp3', status: 'completed', sentiment: 'neutral', score: 65, duration: '3:15' },
    { id: 3, name: 'llamada_ana_20231014.mp3', status: 'completed', sentiment: 'positive', score: 88, duration: '5:01' },
    { id: 4, name: 'seguimiento_carlos_20231014.mp3', status: 'completed', sentiment: 'negative', score: 35, duration: '2:45' },
    { id: 5, name: 'visita_pilar_20231014.mp3', status: 'completed', sentiment: 'positive', score: 95, duration: '6:20' },
  ];

  const startTranscription = () => {
    setTranscribing(true);
    setCurrentFile('nueva_grabacion_20231015.mp3');
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTranscribing(false);
        setSentiment(s => ({ ...s, positive: s.positive + 1 }));
      }
    }, 200);
  };

  return (
    <ScrollArea className="h-full" style={{ background: NAVY }}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Mic size={18} color={GOLD} /> Transcripciones en vivo
            </h2>
            <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>156 grabaciones transcritas \u2022 An\u00E1lisis de sentimiento autom\u00E1tico</p>
          </div>
          <Button onClick={startTranscription} disabled={transcribing} size="sm"
            className="text-xs" style={{ background: transcribing ? 'rgba(255,255,255,0.06)' : GOLD, color: transcribing ? '#6b7280' : NAVY }}>
            {transcribing ? <Loader2 size={12} className="animate-spin mr-1" /> : <Play size={12} className="mr-1" />}
            {transcribing ? 'Transcribiendo...' : 'Transcribir siguiente'}
          </Button>
        </div>

        {/* Waveform animation when transcribing */}
        <AnimatePresence>
          {transcribing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Card className="border-0" style={{ background: NAVY_LIGHT }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Volume2 size={16} color={GOLD} className="animate-pulse" />
                    <span className="text-xs text-white">Transcribiendo: {currentFile}</span>
                    <span className="text-[10px] ml-auto" style={{ color: '#6b7280' }}>{progress}%</span>
                  </div>
                  {/* Animated waveform */}
                  <div className="flex items-center gap-0.5 h-12 justify-center">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <motion.div key={i} className="w-1 rounded-full" style={{ background: GOLD }}
                        animate={{ height: [8, Math.random() * 40 + 8, 8] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.02 }} />
                    ))}
                  </div>
                  <Progress value={progress} className="h-1 mt-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sentiment analysis */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Positivas', value: sentiment.positive, color: '#22c55e' },
            { label: 'Neutras', value: sentiment.neutral, color: '#6b7280' },
            { label: 'Negativas', value: sentiment.negative, color: '#ef4444' },
          ].map(s => (
            <Card key={s.label} className="border-0" style={{ background: NAVY_LIGHT }}>
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] mt-1" style={{ color: '#6b7280' }}>{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recordings list */}
        <Card className="border-0" style={{ background: NAVY_LIGHT }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold" style={{ color: GOLD }}>\u00DAltimas grabaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recordings.map((rec, i) => (
              <motion.div key={rec.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: rec.sentiment === 'positive' ? 'rgba(34,197,94,0.1)' : rec.sentiment === 'negative' ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)' }}>
                  <Mic size={12} color={rec.sentiment === 'positive' ? '#22c55e' : rec.sentiment === 'negative' ? '#ef4444' : '#6b7280'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{rec.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className="text-[8px] h-3.5 px-1" style={{ background: rec.sentiment === 'positive' ? 'rgba(34,197,94,0.1)' : rec.sentiment === 'negative' ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)', color: rec.sentiment === 'positive' ? '#22c55e' : rec.sentiment === 'negative' ? '#ef4444' : '#6b7280', borderColor: 'transparent' }}>
                      {rec.sentiment === 'positive' ? '\uD83D\uDC4D' : rec.sentiment === 'negative' ? '\uD83D\uDC4E' : '\u25EF'} {rec.score}%
                    </Badge>
                    <span className="text-[9px]" style={{ color: '#4b5563' }}>{rec.duration}</span>
                  </div>
                </div>
                <CheckCircle2 size={14} color="#22c55e" />
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

/* ═══════════════════════════════════════════
   PESTA\u00D1A 4: DRIVE STATUS
   ═══════════════════════════════════════════ */
function DriveTab() {
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const folders = [
    { name: 'Grabaciones', count: 156, icon: Mic, lastFile: '2025-07-15' },
    { name: 'Documentos Excel', count: 23, icon: FileSpreadsheet, lastFile: '2025-07-14' },
    { name: 'Contratos PDF', count: 47, icon: FileText, lastFile: '2025-07-15' },
    { name: 'Fotos Propiedades', count: 89, icon: Image, lastFile: '2025-07-13' },
  ];

  const sync = () => {
    setSyncing(true);
    setSyncProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setSyncProgress(p);
      if (p >= 100) { clearInterval(interval); setSyncing(false); }
    }, 300);
  };

  return (
    <ScrollArea className="h-full" style={{ background: NAVY }}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Wifi size={18} color="#22c55e" className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-semibold text-white">Conectado a promurcia2017@gmail.com</span>
              </div>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>\u00DAltima sincronizaci\u00F3n: {SYSTEM_STATE.drive.lastSync}</p>
            </div>
          </div>
          <Button onClick={sync} disabled={syncing} size="sm"
            className="text-xs" style={{ background: syncing ? 'rgba(255,255,255,0.06)' : GOLD, color: syncing ? '#6b7280' : NAVY }}>
            {syncing ? <Loader2 size={12} className="animate-spin mr-1" /> : <RefreshCw size={12} className="mr-1" />}
            {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </Button>
        </div>

        {syncing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Progress value={syncProgress} className="h-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <p className="text-[10px] mt-1 text-center" style={{ color: '#6b7280' }}>Escaneando archivos... {syncProgress}%</p>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {folders.map((folder, i) => (
            <motion.div key={folder.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-0" style={{ background: NAVY_LIGHT }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `rgba(${GOLD_RGB},0.1)` }}>
                      <folder.icon size={16} color={GOLD} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{folder.name}</p>
                      <p className="text-[10px]" style={{ color: '#6b7280' }}>\u00DAltimo archivo: {folder.lastFile}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <span className="text-[10px]" style={{ color: '#6b7280' }}>Archivos</span>
                    <span className="text-base font-bold" style={{ color: GOLD }}>{folder.count}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Storage summary */}
        <Card className="border-0" style={{ background: NAVY_LIGHT }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive size={16} color={GOLD} />
                <span className="text-xs text-white">Total archivos indexados</span>
              </div>
              <span className="text-lg font-bold" style={{ color: GOLD }}>315</span>
            </div>
            <Separator className="my-3" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="grid grid-cols-4 gap-4 text-center">
              {folders.map(f => (
                <div key={f.name}>
                  <div className="text-sm font-semibold text-white">{f.count}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: '#6b7280' }}>{f.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

/* ═══════════════════════════════════════════
   PESTA\u00D1A 5: EMAIL STATUS
   ═══════════════════════════════════════════ */
function EmailTab() {
  const [checking, setChecking] = useState(false);

  const emails = [
    { id: 1, subject: 'Nuevo lead de Idealista', from: 'Mar\u00EDa Garc\u00EDa', source: 'Idealista', time: '14:32', type: 'lead' },
    { id: 2, subject: 'Consulta alquiler', from: 'Fotocasa', source: 'Fotocasa', time: '14:15', type: 'query' },
    { id: 3, subject: 'Solicitud informaci\u00F3n', from: 'WhatsApp Business', source: 'WhatsApp', time: '13:45', type: 'info' },
    { id: 4, subject: 'Contrato de arras', from: 'Carlos Ruiz', source: 'Email', time: '12:30', type: 'contract' },
    { id: 5, subject: 'Cita visita s\u00E1bado', from: 'Laura Mart\u00EDnez', source: 'Web', time: '11:15', type: 'appointment' },
  ];

  const checkEmails = () => {
    setChecking(true);
    setTimeout(() => setChecking(false), 2000);
  };

  return (
    <ScrollArea className="h-full" style={{ background: NAVY }}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Mail size={18} color="#22c55e" className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-semibold text-white">Gmail activo \u2014 promurcia2017@gmail.com</span>
              </div>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>Revisando cada 5 minutos \u2022 {SYSTEM_STATE.gmail.unread} sin leer</p>
            </div>
          </div>
          <Button onClick={checkEmails} disabled={checking} size="sm"
            className="text-xs" style={{ background: checking ? 'rgba(255,255,255,0.06)' : GOLD, color: checking ? '#6b7280' : NAVY }}>
            {checking ? <Loader2 size={12} className="animate-spin mr-1" /> : <Search size={12} className="mr-1" />}
            {checking ? 'Revisando...' : 'Revisar emails ahora'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Sin leer', value: SYSTEM_STATE.gmail.unread, icon: Mail, color: '#ef4444' },
            { label: 'Leads hoy', value: SYSTEM_STATE.gmail.leadsToday, icon: UserPlus, color: '#22c55e' },
            { label: '\u00DAltima revisi\u00F3n', value: '5m', icon: Clock, color: GOLD },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-0" style={{ background: NAVY_LIGHT }}>
                <CardContent className="p-3 flex items-center gap-3">
                  <stat.icon size={18} color={stat.color} />
                  <div>
                    <div className="text-lg font-bold text-white">{stat.value}</div>
                    <div className="text-[10px]" style={{ color: '#6b7280' }}>{stat.label}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Email list */}
        <Card className="border-0" style={{ background: NAVY_LIGHT }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2" style={{ color: GOLD }}>
              <Inbox size={14} /> Emails nuevos detectados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {emails.map((email, i) => (
              <motion.div key={email.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: email.type === 'lead' ? 'rgba(34,197,94,0.1)' : 'rgba(212,168,83,0.1)' }}>
                  {email.type === 'lead' ? <UserPlus size={12} color="#22c55e" /> : <MailOpen size={12} color={GOLD} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">{email.subject}</p>
                  <p className="text-[10px]" style={{ color: '#6b7280' }}>{email.from} \u2022 {email.source}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono" style={{ color: '#4b5563' }}>{email.time}</span>
                  <Eye size={12} color="#6b7280" className="cursor-pointer hover:text-white transition-colors" />
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

/* ═══════════════════════════════════════════
   PESTA\u00D1A 6: PROCESAMIENTO
   ═══════════════════════════════════════════ */
function ProcessingTab() {
  const [phases, setPhases] = useState([
    { id: 'import', label: 'Importar', progress: 100, status: 'completed' as const },
    { id: 'extract', label: 'Extraer', progress: 100, status: 'completed' as const },
    { id: 'clean', label: 'Limpiar', progress: 100, status: 'completed' as const },
    { id: 'link', label: 'Vincular', progress: 100, status: 'completed' as const },
  ]);
  const [reprocessing, setReprocessing] = useState(false);

  const reprocess = () => {
    setReprocessing(true);
    setPhases(phases.map(p => ({ ...p, progress: 0, status: 'processing' as const })));

    phases.forEach((_, phaseIndex) => {
      setTimeout(() => {
        setPhases(prev => prev.map((p, i) => {
          if (i === phaseIndex) return { ...p, progress: 100, status: 'completed' as const };
          if (i === phaseIndex + 1) return { ...p, status: 'processing' as const };
          return p;
        }));
        if (phaseIndex === phases.length - 1) setReprocessing(false);
      }, (phaseIndex + 1) * 1500);
    });
  };

  return (
    <ScrollArea className="h-full" style={{ background: NAVY }}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity size={18} color={GOLD} /> Procesamiento de datos
            </h2>
            <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>Pipeline de procesamiento autom\u00E1tico de datos</p>
          </div>
          <Button onClick={reprocess} disabled={reprocessing} size="sm"
            className="text-xs" style={{ background: reprocessing ? 'rgba(255,255,255,0.06)' : GOLD, color: reprocessing ? '#6b7280' : NAVY }}>
            {reprocessing ? <Loader2 size={12} className="animate-spin mr-1" /> : <RefreshCw size={12} className="mr-1" />}
            {reprocessing ? 'Procesando...' : 'Reprocesar todo'}
          </Button>
        </div>

        <div className="space-y-4">
          {phases.map((phase, i) => (
            <motion.div key={phase.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-0" style={{ background: NAVY_LIGHT }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: phase.status === 'completed' ? 'rgba(34,197,94,0.1)' : `rgba(${GOLD_RGB},0.1)` }}>
                        {phase.status === 'completed' ? <CheckCircle2 size={16} color="#22c55e" /> : <Loader2 size={16} color={GOLD} className="animate-spin" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{phase.label}</p>
                        <p className="text-[10px]" style={{ color: '#6b7280' }}>
                          {phase.status === 'completed' ? 'Completado' : 'En proceso...'}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold" style={{ color: phase.status === 'completed' ? '#22c55e' : GOLD }}>{phase.progress}%</span>
                  </div>
                  <Progress value={phase.progress} className="h-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <Card className="border-0" style={{ background: NAVY_LIGHT }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} color="#22c55e" />
              <span className="text-sm font-semibold text-white">Resumen del procesamiento</span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { label: 'Datos importados', value: '1.247' },
                { label: 'Campos extra\u00EDdos', value: '15.432' },
                { label: 'Registros limpios', value: '1.198' },
                { label: 'V\u00EDnculos creados', value: '892' },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-lg font-bold" style={{ color: GOLD }}>{item.value}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: '#6b7280' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

/* ═══════════════════════════════════════════
   COMPONENTE PRINCIPAL: CEREBRO CRM
   ═══════════════════════════════════════════ */
export default function CerebroCrmApp() {
  const [activeTab, setActiveTab] = useState('chat');

  const renderTab = () => {
    switch (activeTab) {
      case 'chat': return <ChatTab />;
      case 'dashboard': return <DashboardTab />;
      case 'transcriptions': return <TranscriptionsTab />;
      case 'drive': return <DriveTab />;
      case 'email': return <EmailTab />;
      case 'processing': return <ProcessingTab />;
      default: return <ChatTab />;
    }
  };

  return (
    <div className="flex h-full w-full" style={{ background: NAVY }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="h-full">
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
