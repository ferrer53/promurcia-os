import { useState, useCallback } from 'react';
import {
  ArrowLeft, ArrowRight, RotateCw, Home, Search, Star, Globe, Building2,
  MapPin, Sun, Cloud, CloudRain, Thermometer, Wind, Droplets,
  Mail, Phone, ExternalLink, Check
} from 'lucide-react';

interface Bookmark {
  name: string;
  url: string;
  icon: typeof Globe;
  color: string;
}

const BOOKMARKS: Bookmark[] = [
  { name: 'Promurcia.com', url: 'promurcia.com', icon: Globe, color: '#d4a853' },
  { name: 'Idealista', url: 'idealista.com', icon: Building2, color: '#dfae3a' },
  { name: 'Fotocasa', url: 'fotocasa.es', icon: MapPin, color: '#e74c3c' },
  { name: 'Google', url: 'google.es', icon: Search, color: '#4285f4' },
  { name: 'El Tiempo', url: 'eltiempo.es', icon: Sun, color: '#e67e22' },
];

type PageId = 'promurcia' | 'idealista' | 'fotocasa' | 'google' | 'eltiempo';

export default function Browser() {
  const [currentPage, setCurrentPage] = useState<PageId>('promurcia');
  const [urlInput, setUrlInput] = useState('promurcia.com');
  const [history, setHistory] = useState<PageId[]>(['promurcia']);
  const [historyPos, setHistoryPos] = useState(0);

  const navigateTo = useCallback((page: PageId) => {
    setCurrentPage(page);
    const urlMap: Record<PageId, string> = {
      promurcia: 'promurcia.com',
      idealista: 'idealista.com',
      fotocasa: 'fotocasa.es',
      google: 'google.es',
      eltiempo: 'eltiempo.es',
    };
    setUrlInput(urlMap[page]);
    const newHistory = history.slice(0, historyPos + 1);
    newHistory.push(page);
    setHistory(newHistory);
    setHistoryPos(newHistory.length - 1);
  }, [history, historyPos]);

  const goBack = () => {
    if (historyPos > 0) {
      const newPos = historyPos - 1;
      setHistoryPos(newPos);
      setCurrentPage(history[newPos]);
    }
  };

  const goForward = () => {
    if (historyPos < history.length - 1) {
      const newPos = historyPos + 1;
      setHistoryPos(newPos);
      setCurrentPage(history[newPos]);
    }
  };

  const handleUrlSubmit = () => {
    const input = urlInput.toLowerCase();
    if (input.includes('promurcia')) navigateTo('promurcia');
    else if (input.includes('idealista')) navigateTo('idealista');
    else if (input.includes('fotocasa')) navigateTo('fotocasa');
    else if (input.includes('google')) navigateTo('google');
    else if (input.includes('tiempo') || input.includes('weather')) navigateTo('eltiempo');
  };

  const currentBookmark = BOOKMARKS.find(b => {
    const map: Record<PageId, string> = { promurcia: 'promurcia.com', idealista: 'idealista.com', fotocasa: 'fotocasa.es', google: 'google.es', eltiempo: 'eltiempo.es' };
    return map[currentPage] === b.url;
  });

  return (
    <div className="flex flex-col h-full w-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Chrome */}
      <div className="flex flex-col" style={{ background: '#111d32', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Address bar row */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex items-center gap-1">
            <button onClick={goBack} className="p-1.5 rounded hover:bg-white/5" disabled={historyPos <= 0}>
              <ArrowLeft size={16} color={historyPos > 0 ? '#d1d5db' : '#4b5563'} />
            </button>
            <button onClick={goForward} className="p-1.5 rounded hover:bg-white/5" disabled={historyPos >= history.length - 1}>
              <ArrowRight size={16} color={historyPos < history.length - 1 ? '#d1d5db' : '#4b5563'} />
            </button>
            <button onClick={() => navigateTo(currentPage)} className="p-1.5 rounded hover:bg-white/5">
              <RotateCw size={14} color="#9ca3af" />
            </button>
            <button onClick={() => navigateTo('promurcia')} className="p-1.5 rounded hover:bg-white/5">
              <Home size={14} color="#9ca3af" />
            </button>
          </div>
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Globe size={14} color="#6b7280" />
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: '#d1d5db' }}
            />
          </div>
        </div>
        {/* Bookmarks bar */}
        <div className="flex items-center gap-1 px-3 pb-2">
          {BOOKMARKS.map(bm => {
            const Icon = bm.icon;
            const isActive = currentBookmark?.url === bm.url;
            return (
              <button
                key={bm.url}
                onClick={() => {
                  const pageMap: Record<string, PageId> = { 'promurcia.com': 'promurcia', 'idealista.com': 'idealista', 'fotocasa.es': 'fotocasa', 'google.es': 'google', 'eltiempo.es': 'eltiempo' };
                  navigateTo(pageMap[bm.url]);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all"
                style={{
                  background: isActive ? 'rgba(212,168,83,0.1)' : 'transparent',
                  color: isActive ? '#d4a853' : '#9ca3af',
                }}
              >
                <Icon size={12} color={bm.color} />
                {bm.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto">
        {currentPage === 'promurcia' && <PromurciaPage />}
        {currentPage === 'idealista' && <IdealistaPage />}
        {currentPage === 'fotocasa' && <FotocasaPage />}
        {currentPage === 'google' && <GooglePage />}
        {currentPage === 'eltiempo' && <ElTiempoPage />}
      </div>
    </div>
  );
}

function PromurciaPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl font-bold" style={{ background: '#d4a853', color: '#0a1628' }}>
          P
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#d4a853' }}>Promurcia.com</h1>
        <p className="text-sm" style={{ color: '#9ca3af' }}>Inmobiliaria de referencia en la Region de Murcia</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { title: 'Comprar', desc: 'Encuentra tu hogar ideal' },
          { title: 'Alquilar', desc: 'Propiedades en alquiler' },
          { title: 'Vender', desc: 'Vende tu propiedad' },
          { title: 'Valorar', desc: 'Tasacion gratuita' },
        ].map(item => (
          <div key={item.title} className="rounded-xl p-4 text-center cursor-pointer hover:scale-[1.02] transition-transform" style={{ background: '#111d32', border: '1px solid rgba(212,168,83,0.15)' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#d4a853' }}>{item.title}</h3>
            <p className="text-xs" style={{ color: '#6b7280' }}>{item.desc}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-sm font-semibold mb-3">Contacto</h3>
        <div className="flex items-center gap-2 mb-2">
          <Phone size={14} color="#d4a853" />
          <span className="text-xs" style={{ color: '#d1d5db' }}>+34 968 123 456</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail size={14} color="#d4a853" />
          <span className="text-xs" style={{ color: '#d1d5db' }}>info@promurcia.com</span>
        </div>
      </div>
    </div>
  );
}

function IdealistaPage() {
  const listings = [
    { title: 'Piso en centro de Murcia', price: '185.000 €', beds: 3, m2: 95, tag: 'En venta' },
    { title: 'Chalet en La Manga', price: '420.000 €', beds: 4, m2: 210, tag: 'En venta' },
    { title: 'Apartamento en Cartagena', price: '95.000 €', beds: 2, m2: 68, tag: 'En venta' },
    { title: 'Atico en Alicante', price: '250.000 €', beds: 3, m2: 120, tag: 'Nuevo' },
  ];
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold" style={{ background: '#dfae3a', color: '#fff' }}>i</div>
        <div>
          <h1 className="text-lg font-bold">Idealista</h1>
          <p className="text-xs" style={{ color: '#9ca3af' }}> Pisos y casas en venta y alquiler</p>
        </div>
      </div>
      <div className="rounded-lg p-3 mb-4 flex items-center gap-2" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Search size={16} color="#6b7280" />
        <input placeholder="Buscar vivienda..." className="flex-1 bg-transparent outline-none text-sm" style={{ color: '#fff' }} />
      </div>
      <div className="space-y-3">
        {listings.map((l, i) => (
          <div key={i} className="rounded-lg p-4 flex items-center gap-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-20 h-16 rounded flex items-center justify-center shrink-0" style={{ background: '#1a2744' }}>
              <Building2 size={24} color="#6b7280" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium">{l.title}</h3>
              <div className="flex gap-3 text-xs mt-1" style={{ color: '#6b7280' }}>
                <span>{l.beds} habs</span>
                <span>{l.m2} m²</span>
                <span className="px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>{l.tag}</span>
              </div>
            </div>
            <div className="text-sm font-bold" style={{ color: '#dfae3a' }}>{l.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FotocasaPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold" style={{ background: '#e74c3c', color: '#fff' }}>f</div>
        <div>
          <h1 className="text-lg font-bold">Fotocasa</h1>
          <p className="text-xs" style={{ color: '#9ca3af' }}> Casas y pisos</p>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <button className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ background: '#e74c3c', color: '#fff' }}>Comprar</button>
        <button className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ background: '#1a2744', color: '#9ca3af' }}>Alquilar</button>
        <button className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ background: '#1a2744', color: '#9ca3af' }}>Compartir</button>
      </div>
      <div className="rounded-lg p-3 mb-4 flex items-center gap-2" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.08)' }}>
        <MapPin size={16} color="#6b7280" />
        <input placeholder="Murcia, Cartagena, Lorca..." className="flex-1 bg-transparent outline-none text-sm" style={{ color: '#fff' }} />
      </div>
      <p className="text-xs text-center" style={{ color: '#6b7280' }}>3.245 propiedades encontradas en Murcia</p>
    </div>
  );
}

function GooglePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h1 className="text-4xl font-bold mb-6">
        <span style={{ color: '#4285f4' }}>G</span>
        <span style={{ color: '#ea4335' }}>o</span>
        <span style={{ color: '#fbbc05' }}>o</span>
        <span style={{ color: '#4285f4' }}>g</span>
        <span style={{ color: '#34a853' }}>l</span>
        <span style={{ color: '#ea4335' }}>e</span>
      </h1>
      <div className="w-full max-w-lg rounded-full px-4 py-2.5 flex items-center gap-3 mb-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Search size={18} color="#6b7280" />
        <input placeholder="Buscar en Google..." className="flex-1 bg-transparent outline-none text-sm" style={{ color: '#fff' }} />
      </div>
      <div className="flex gap-2">
        <button className="px-4 py-2 rounded text-xs" style={{ background: '#1a2744', color: '#d1d5db' }}>Buscar con Google</button>
        <button className="px-4 py-2 rounded text-xs" style={{ background: '#1a2744', color: '#d1d5db' }}>Voy a tener suerte</button>
      </div>
    </div>
  );
}

function ElTiempoPage() {
  const forecast = [
    { day: 'Lun', icon: Sun, temp: 24 },
    { day: 'Mar', icon: CloudRain, temp: 19 },
    { day: 'Mie', icon: Cloud, temp: 22 },
    { day: 'Jue', icon: Sun, temp: 25 },
    { day: 'Vie', icon: Sun, temp: 27 },
  ];
  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Sun size={24} color="#e67e22" />
        <div>
          <h1 className="text-lg font-bold">El Tiempo</h1>
          <p className="text-xs" style={{ color: '#9ca3af' }}> Murcia, Espana</p>
        </div>
      </div>
      <div className="rounded-xl p-6 text-center mb-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Sun size={64} color="#f59e0b" className="mx-auto mb-3" />
        <div className="text-5xl font-bold mb-1">24°C</div>
        <div className="text-sm" style={{ color: '#9ca3af' }}>Soleado</div>
        <div className="flex justify-center gap-6 mt-4 text-xs" style={{ color: '#6b7280' }}>
          <span className="flex items-center gap-1"><Thermometer size={14} /> Max 28°</span>
          <span className="flex items-center gap-1"><Droplets size={14} /> Hum 45%</span>
          <span className="flex items-center gap-1"><Wind size={14} /> 12 km/h</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {forecast.map(d => {
          const Icon = d.icon;
          return (
            <div key={d.day} className="rounded-lg p-3 text-center" style={{ background: '#111d32' }}>
              <div className="text-xs font-medium mb-2">{d.day}</div>
              <Icon size={20} color="#f59e0b" className="mx-auto mb-2" />
              <div className="text-sm font-bold">{d.temp}°</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
