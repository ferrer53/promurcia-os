import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Key,
  Save,
  Play,
  ChevronDown,
  Eye,
  EyeOff,
  Bot,
  Cloud,
  MessageCircle,
  Webhook,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { toast } from 'sonner';

const STORAGE_KEY = 'promurcia_apis';

interface ApiConfig {
  // Seccion 1: IA / Modelos de Lenguaje
  openai_api_key: string;
  openai_model: string;
  deepseek_api_key: string;
  claude_api_key: string;
  claude_model: string;
  pepnillo_api_key: string;
  dify_api_key: string;
  dify_base_url: string;

  // Seccion 2: Google Cloud APIs
  google_client_id: string;
  google_client_secret: string;
  google_service_account: string;
  gmail_refresh_token: string;

  // Seccion 3: WhatsApp Business
  whatsapp_api_token: string;
  whatsapp_phone_id: string;
  whatsapp_business_id: string;

  // Seccion 4: Webhooks y Otros
  webhook_secret: string;
  webhook_url: string;
}

const defaultConfig: ApiConfig = {
  openai_api_key: '',
  openai_model: 'gpt-4o-mini',
  deepseek_api_key: '',
  claude_api_key: '',
  claude_model: 'claude-sonnet-4-20250514',
  pepnillo_api_key: '',
  dify_api_key: '',
  dify_base_url: 'https://api.dify.ai/v1',

  google_client_id: '',
  google_client_secret: '',
  google_service_account: '',
  gmail_refresh_token: '',

  whatsapp_api_token: '',
  whatsapp_phone_id: '',
  whatsapp_business_id: '',

  webhook_secret: '',
  webhook_url: '',
};

function loadConfig(): ApiConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultConfig, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...defaultConfig };
}

function saveConfig(config: ApiConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function StatusDot({ filled }: { filled: boolean }) {
  return filled ? (
    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
  ) : (
    <XCircle size={14} className="text-gray-600 shrink-0" />
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex-1">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 bg-[#111d32]/60 border-[#1a2744] text-white placeholder:text-gray-600 focus:border-[#d4a853] focus:ring-[#d4a853]/20"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        style={{ minWidth: 20, minHeight: 20 }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionSection({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(17,29,50,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 transition-all duration-200 hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center" style={{ color: '#d4a853' }}>
            {icon}
          </div>
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} color="#6b7280" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 space-y-4">{children}</div>
      </motion.div>
    </div>
  );
}

interface FieldRowProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'password' | 'text' | 'textarea' | 'select';
  options?: string[];
}

function FieldRow({ label, value, onChange, placeholder, type = 'text', options }: FieldRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="pt-2">
        <StatusDot filled={!!value} />
      </div>
      <div className="flex-1 min-w-0">
        <Label className="text-xs text-gray-400 mb-1.5 block">{label}</Label>
        {type === 'password' ? (
          <PasswordInput value={value} onChange={onChange} placeholder={placeholder} />
        ) : type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full rounded-md text-sm text-white placeholder:text-gray-600 outline-none transition-all resize-none"
            style={{
              background: 'rgba(17,29,50,0.6)',
              border: '1px solid #1a2744',
              padding: '8px 12px',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#d4a853'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1a2744'; }}
          />
        ) : type === 'select' && options ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md text-sm text-white outline-none transition-all"
            style={{
              background: 'rgba(17,29,50,0.6)',
              border: '1px solid #1a2744',
              padding: '8px 12px',
              height: 36,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#d4a853'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1a2744'; }}
          >
            {options.map((opt) => (
              <option key={opt} value={opt} style={{ background: '#111d32' }}>{opt}</option>
            ))}
          </select>
        ) : (
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-[#111d32]/60 border-[#1a2744] text-white placeholder:text-gray-600 focus:border-[#d4a853] focus:ring-[#d4a853]/20"
          />
        )}
      </div>
    </div>
  );
}

export default function ApiConfigApp() {
  const [config, setConfig] = useState<ApiConfig>(loadConfig);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const updateField = useCallback((field: keyof ApiConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = () => {
    saveConfig(config);
    toast.success('Configuracion guardada', {
      description: 'Todas las APIs han sido configuradas correctamente.',
    });
  };

  const handleTest = (apiName: string) => {
    toast.info(`Probando ${apiName}...`, {
      description: 'Conexion simulada - en produccion se validaria la API.',
    });
  };

  const filledCount = Object.values(config).filter((v) => typeof v === 'string' && v.trim() !== '').length;
  const totalFields = Object.keys(defaultConfig).length;

  return (
    <div className="h-full flex flex-col text-white" style={{ background: '#0a1628' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <Key size={20} color="#d4a853" />
          <div>
            <h2 className="text-sm font-bold text-white">Configuracion de APIs</h2>
            <p className="text-[10px] text-gray-500">Gestiona todas las APIs externas del sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-[#d4a853]/30 text-[#d4a853]">
            {filledCount}/{totalFields} configuradas
          </Badge>
          <Button
            onClick={handleSave}
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            style={{ background: '#d4a853', color: '#0a1628' }}
          >
            <Save size={14} />
            Guardar
          </Button>
        </div>
      </div>

      <Separator style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Seccion 1: IA */}
        <AccordionSection title="IA / Modelos de Lenguaje" icon={<Bot size={18} />} defaultOpen>
          <FieldRow
            label="OpenAI API Key"
            value={config.openai_api_key}
            onChange={(v) => updateField('openai_api_key', v)}
            type="password"
            placeholder="sk-..."
          />
          <FieldRow
            label="Modelo OpenAI"
            value={config.openai_model}
            onChange={(v) => updateField('openai_model', v)}
            type="select"
            options={['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']}
          />
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={() => handleTest('OpenAI')}
              variant="outline"
              size="sm"
              className="gap-1 text-xs border-[#1a2744] text-gray-300 hover:bg-[#d4a853]/10 hover:text-[#d4a853] hover:border-[#d4a853]/30"
            >
              <Play size={12} />
              Probar conexion
            </Button>
          </div>

          <Separator className="my-1" style={{ background: 'rgba(255,255,255,0.04)' }} />

          <FieldRow
            label="DeepSeek API Key"
            value={config.deepseek_api_key}
            onChange={(v) => updateField('deepseek_api_key', v)}
            type="password"
            placeholder="sk-..."
          />
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={() => handleTest('DeepSeek')}
              variant="outline"
              size="sm"
              className="gap-1 text-xs border-[#1a2744] text-gray-300 hover:bg-[#d4a853]/10 hover:text-[#d4a853] hover:border-[#d4a853]/30"
            >
              <Play size={12} />
              Probar conexion
            </Button>
          </div>

          <Separator className="my-1" style={{ background: 'rgba(255,255,255,0.04)' }} />

          <FieldRow
            label="Claude / Anthropic API Key"
            value={config.claude_api_key}
            onChange={(v) => updateField('claude_api_key', v)}
            type="password"
            placeholder="sk-ant-..."
          />
          <FieldRow
            label="Modelo Claude"
            value={config.claude_model}
            onChange={(v) => updateField('claude_model', v)}
            type="select"
            options={['claude-sonnet-4-20250514', 'claude-haiku', 'claude-opus-4']}
          />
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={() => handleTest('Claude')}
              variant="outline"
              size="sm"
              className="gap-1 text-xs border-[#1a2744] text-gray-300 hover:bg-[#d4a853]/10 hover:text-[#d4a853] hover:border-[#d4a853]/30"
            >
              <Play size={12} />
              Probar conexion
            </Button>
          </div>

          <Separator className="my-1" style={{ background: 'rgba(255,255,255,0.04)' }} />

          <FieldRow
            label="Pepnillo API Key"
            value={config.pepnillo_api_key}
            onChange={(v) => updateField('pepnillo_api_key', v)}
            type="password"
            placeholder="..."
          />

          <Separator className="my-1" style={{ background: 'rgba(255,255,255,0.04)' }} />

          <FieldRow
            label="Dify API Key"
            value={config.dify_api_key}
            onChange={(v) => updateField('dify_api_key', v)}
            type="password"
            placeholder="..."
          />
          <FieldRow
            label="Dify Base URL"
            value={config.dify_base_url}
            onChange={(v) => updateField('dify_base_url', v)}
            placeholder="https://api.dify.ai/v1"
          />
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={() => handleTest('Dify')}
              variant="outline"
              size="sm"
              className="gap-1 text-xs border-[#1a2744] text-gray-300 hover:bg-[#d4a853]/10 hover:text-[#d4a853] hover:border-[#d4a853]/30"
            >
              <Play size={12} />
              Probar conexion
            </Button>
          </div>
        </AccordionSection>

        {/* Seccion 2: Google Cloud */}
        <AccordionSection title="Google Cloud APIs" icon={<Cloud size={18} />}>
          <FieldRow
            label="Google Client ID"
            value={config.google_client_id}
            onChange={(v) => updateField('google_client_id', v)}
            placeholder="...apps.googleusercontent.com"
          />
          <FieldRow
            label="Google Client Secret"
            value={config.google_client_secret}
            onChange={(v) => updateField('google_client_secret', v)}
            type="password"
            placeholder="GOCSPX-..."
          />
          <FieldRow
            label="Service Account Key (JSON)"
            value={config.google_service_account}
            onChange={(v) => updateField('google_service_account', v)}
            type="textarea"
            placeholder="Pega aqui el JSON de la cuenta de servicio..."
          />
          <FieldRow
            label="Gmail Refresh Token"
            value={config.gmail_refresh_token}
            onChange={(v) => updateField('gmail_refresh_token', v)}
            type="password"
            placeholder="1//..."
          />
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={() => handleTest('Google Cloud')}
              variant="outline"
              size="sm"
              className="gap-1 text-xs border-[#1a2744] text-gray-300 hover:bg-[#d4a853]/10 hover:text-[#d4a853] hover:border-[#d4a853]/30"
            >
              <Play size={12} />
              Probar conexion
            </Button>
          </div>
        </AccordionSection>

        {/* Seccion 3: WhatsApp */}
        <AccordionSection title="WhatsApp Business" icon={<MessageCircle size={18} />}>
          <FieldRow
            label="WhatsApp API Token"
            value={config.whatsapp_api_token}
            onChange={(v) => updateField('whatsapp_api_token', v)}
            type="password"
            placeholder="EAAX..."
          />
          <FieldRow
            label="Phone Number ID"
            value={config.whatsapp_phone_id}
            onChange={(v) => updateField('whatsapp_phone_id', v)}
            placeholder="1234567890"
          />
          <FieldRow
            label="Business Account ID"
            value={config.whatsapp_business_id}
            onChange={(v) => updateField('whatsapp_business_id', v)}
            placeholder="1234567890"
          />
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={() => handleTest('WhatsApp Business')}
              variant="outline"
              size="sm"
              className="gap-1 text-xs border-[#1a2744] text-gray-300 hover:bg-[#d4a853]/10 hover:text-[#d4a853] hover:border-[#d4a853]/30"
            >
              <Play size={12} />
              Probar conexion
            </Button>
          </div>
        </AccordionSection>

        {/* Seccion 4: Webhooks */}
        <AccordionSection title="Webhooks y Otros" icon={<Webhook size={18} />}>
          <FieldRow
            label="Webhook Secret"
            value={config.webhook_secret}
            onChange={(v) => updateField('webhook_secret', v)}
            type="password"
            placeholder="whsec_..."
          />
          <FieldRow
            label="URL del Endpoint"
            value={config.webhook_url}
            onChange={(v) => updateField('webhook_url', v)}
            placeholder="https://tudominio.com/webhook"
          />
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={() => handleTest('Webhook')}
              variant="outline"
              size="sm"
              className="gap-1 text-xs border-[#1a2744] text-gray-300 hover:bg-[#d4a853]/10 hover:text-[#d4a853] hover:border-[#d4a853]/30"
            >
              <Play size={12} />
              Probar conexion
            </Button>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}
