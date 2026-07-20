import { useState, useMemo } from 'react';
import {
  Newspaper, Star, StarOff, RefreshCw, Search, Clock, ChevronRight, Globe
} from 'lucide-react';

type FeedId = 'elpais' | 'elmundo' | 'abc' | 'idealista' | 'fotocasa';

interface Article {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  source: FeedId;
  read: boolean;
  starred: boolean;
}

const FEEDS: { id: FeedId; label: string; color: string }[] = [
  { id: 'elpais', label: 'El Pais', color: '#1a4b8c' },
  { id: 'elmundo', label: 'El Mundo', color: '#c41e3a' },
  { id: 'abc', label: 'ABC', color: '#1d3557' },
  { id: 'idealista', label: 'Idealista News', color: '#dfae3a' },
  { id: 'fotocasa', label: 'Fotocasa Blog', color: '#e74c3c' },
];

const ARTICLES: Article[] = [
  { id: 1, title: 'El precio de la vivienda sube un 5.2% en 2025', excerpt: 'El mercado inmobiliario espanol continua su tendencia alcista...', content: 'El precio de la vivienda en Espana ha experimentado un incremento del 5.2% durante el ano 2025, segun los ultimos datos del Ministerio de Transportes y Movilidad. Esta subida se produce en un contexto de estabilizacion de los tipos de interes por parte del Banco Central Europeo.\n\nLas regiones mas afectadas por esta subida son Madrid, Barcelona y Valencia, donde el incremento ha superado el 7% en algunas zonas. Sin embargo, la Region de Murcia ha mantenido un crecimiento mas moderado del 3.8%.\n\nLos expertos senalan que la demanda continuada, unida a la escasez de oferta de vivienda nueva, son los principales factores que explican esta tendencia.', date: '13 feb 2026', source: 'elpais', read: false, starred: true },
  { id: 2, title: 'La compraventa de viviendas se dispara en enero', excerpt: 'Las transacciones inmobiliarias han aumentado un 15% respecto al ano anterior...', content: 'El mes de enero ha cerrado con un aumento del 15% en el numero de compraventas de vivienda respecto al mismo periodo del ano anterior. Este dato, facilitado por el Colegio de Registradores, supera las expectativas del sector.\n\nEl crecimiento ha sido especialmente notable en las viviendas nuevas, que han incrementado sus ventas en un 22%.', date: '12 feb 2026', source: 'elmundo', read: false, starred: false },
  { id: 3, title: 'Hipotecas: el Euribor se mantiene estable', excerpt: 'El indice hipotecario se situa en el 2.95% en la ultima revision...', content: 'El Euribor ha cerrado el mes de febrero con una ligera bajada, situandose en el 2.95%. Este valor beneficia a los hipotecados, que ven como sus cuotas mensuales se mantienen estables o incluso descienden ligeramente.\n\nLos analistas financieros previenen que esta tendencia podria continuar durante los proximos meses.', date: '11 feb 2026', source: 'abc', read: true, starred: false },
  { id: 4, title: 'Murcia, destino emergente para la inversión inmobiliaria', excerpt: 'La Region atrae cada vez mas inversores nacionales e internacionales...', content: 'La Region de Murcia se consolida como uno de los destinos preferidos para la inversión inmobiliaria. Sus precios competitivos, unido a un clima privilegiado y una excelente conectividad, la convierten en una opcion atractiva tanto para compradores nacionales como extranjeros.\n\nLas zonas mas demandadas son La Manga del Mar Menor, Cartagena y el centro de Murcia capital.', date: '10 feb 2026', source: 'idealista', read: true, starred: true },
  { id: 5, title: 'Guia para comprar piso en 2026', excerpt: 'Todo lo que necesitas saber antes de dar el paso...', content: 'Comprar una vivienda es una de las decisiones mas importantes de nuestra vida. En esta guia te contamos todos los pasos que debes seguir, desde la busqueda hasta la firma de la escritura.\n\n1. Define tu presupuesto\n2. Busca la zona ideal\n3. Visita varias propiedades\n4. Negocia el precio\n5. Revisa la documentacion\n6. Firma la escritura', date: '9 feb 2026', source: 'fotocasa', read: true, starred: false },
  { id: 6, title: 'El alquiler turistico regula su actividad en la costa', excerpt: 'Nueva normativa para apartamentos vacacionales...', content: 'El Gobierno ha aprobado una nueva normativa que regula la actividad de alquiler de viviendas con fines turisticos en las zonas costeras. La medida busca equilibrar el derecho a la vivienda con la actividad turistica.', date: '8 feb 2026', source: 'elpais', read: true, starred: false },
  { id: 7, title: 'La construcción de viviendas repunta un 12%', excerpt: 'Las nuevas licencias de obra muestran una clara recuperacion...', content: 'El sector de la construcción ha recibido un impulso significativo con un aumento del 12% en las licencias de obra nueva. Este crecimiento es una senal positiva para el mercado inmobiliario.', date: '7 feb 2026', source: 'elmundo', read: false, starred: false },
  { id: 8, title: 'Tasaciones: como se valora una vivienda', excerpt: 'Conoce el proceso de valoracion de propiedades...', content: 'La tasacion de una vivienda es un proceso tecnico que determina el valor de mercado de una propiedad. Un perito judicial analiza multiples factores como la ubicacion, el estado de conservacion, los metros cuadrados y las calidades.', date: '6 feb 2026', source: 'abc', read: true, starred: false },
  { id: 9, title: 'Promurcia abre nueva oficina en Cartagena', excerpt: 'La inmobiliaria amplia su presencia en la Region...', content: 'Promurcia.com ha inaugurado su nueva oficina en el centro de Cartagena, consolidando su presencia en la Region de Murcia. La apertura coincide con el lanzamiento de su nuevo sistema CRM, Cerebro Promurcia.', date: '5 feb 2026', source: 'idealista', read: false, starred: true },
  { id: 10, title: 'Reformas que aumentan el valor de tu casa', excerpt: 'Descubre que mejoras son mas rentables...', content: 'No todas las reformas tienen el mismo retorno de inversión. Segun los expertos, las reformas de cocina y bano son las que mayor valor anaden a una vivienda, seguidas de la mejora de la eficiencia energetica.', date: '4 feb 2026', source: 'fotocasa', read: true, starred: false },
  { id: 11, title: 'El mercado de oficinas en Murcia crece un 8%', excerpt: 'La demanda de espacios de trabajo aumenta...', content: 'El mercado de oficinas en la Region de Murcia ha experimentado un crecimiento del 8% en el ultimo ano. La tendencia al teletrabajo ha modificado las preferencias de los usuarios.', date: '3 feb 2026', source: 'elpais', read: true, starred: false },
  { id: 12, title: 'Los jovenes y el acceso a la vivienda', excerpt: 'Un estudio analiza las dificultades de los menores de 35...', content: 'Un estudio reciente pone de manifesto las dificultades que enfrentan los jovenes menores de 35 anos para acceder a la vivienda. Los precios elevados y la precariedad laboral son los principales obstaculos.', date: '2 feb 2026', source: 'elmundo', read: false, starred: false },
  { id: 13, title: 'El efecto AVE en el mercado inmobiliario', excerpt: 'La llegada del tren de alta velocidad impulsa los precios...', content: 'La llegada del AVE a la Region de Murcia ha tenido un efecto positivo en el mercado inmobiliario. Las zonas cercanas a las estaciones han visto incrementar su valor entre un 5% y un 10%.', date: '1 feb 2026', source: 'abc', read: true, starred: false },
  { id: 14, title: 'Viviendas sostenibles: el futuro del sector', excerpt: 'Las casas con certificacion energetica A son cada vez mas demandadas...', content: 'La sostenibilidad se ha convertido en un factor determinante en la compra de vivienda. Los compradores valoran cada vez mas las certificaciones energeticas y las instalaciones de energias renovables.', date: '31 ene 2026', source: 'idealista', read: true, starred: false },
  { id: 15, title: 'Comparador: alquilar vs comprar en 2026', excerpt: 'Analisis de rentabilidad en las principales ciudades...', content: 'La eterna duda entre alquilar o comprar vivienda depende de multiples factores personales y economicos. En este analisis comparamos ambas opciones en las principales ciudades espanolas.', date: '30 ene 2026', source: 'fotocasa', read: true, starred: false },
];

export default function RSSReader() {
  const [articles, setArticles] = useState<Article[]>(ARTICLES);
  const [activeFeed, setActiveFeed] = useState<FeedId | 'all'>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    return articles.filter(a => {
      const inFeed = activeFeed === 'all' || a.source === activeFeed;
      const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.excerpt.toLowerCase().includes(search.toLowerCase());
      return inFeed && matchesSearch;
    });
  }, [articles, activeFeed, search]);

  const selected = articles.find(a => a.id === selectedId);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setArticles(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const toggleStar = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setArticles(prev => prev.map(a => a.id === id ? { ...a, starred: !a.starred } : a));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const unreadCount = (feed: FeedId | 'all') => feed === 'all'
    ? articles.filter(a => !a.read).length
    : articles.filter(a => a.source === feed && !a.read).length;

  return (
    <div className="flex h-full w-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Feeds sidebar */}
      <div className="w-44 shrink-0 border-r flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#111d32' }}>
        <div className="p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>Fuentes</h2>
          <nav className="space-y-0.5">
            <button
              onClick={() => { setActiveFeed('all'); setSelectedId(null); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-all"
              style={{
                background: activeFeed === 'all' ? 'rgba(212,168,83,0.1)' : 'transparent',
                color: activeFeed === 'all' ? '#d4a853' : '#9ca3af',
              }}
            >
              <Newspaper size={14} />
              <span className="flex-1 text-left">Todas</span>
              {unreadCount('all') > 0 && <span className="text-[10px]" style={{ color: '#ef4444' }}>{unreadCount('all')}</span>}
            </button>
            {FEEDS.map(f => (
              <button
                key={f.id}
                onClick={() => { setActiveFeed(f.id); setSelectedId(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-all"
                style={{
                  background: activeFeed === f.id ? 'rgba(212,168,83,0.1)' : 'transparent',
                  color: activeFeed === f.id ? '#d4a853' : '#9ca3af',
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: f.color }} />
                <span className="flex-1 text-left">{f.label}</span>
                {unreadCount(f.id) > 0 && <span className="text-[10px]" style={{ color: '#ef4444' }}>{unreadCount(f.id)}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Article list */}
      <div className="w-64 shrink-0 border-r overflow-auto" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0f1a2b' }}>
        <div className="flex items-center gap-2 p-2">
          <div className="relative flex-1">
            <Search size={12} color="#6b7280" className="absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar articulos..."
              className="w-full pl-7 pr-2 py-1.5 rounded text-xs outline-none"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
            />
          </div>
          <button onClick={handleRefresh} className={`p-1.5 rounded hover:bg-white/5 ${refreshing ? 'animate-spin' : ''}`}>
            <RefreshCw size={14} color="#9ca3af" />
          </button>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {filtered.map(article => {
            const feed = FEEDS.find(f => f.id === article.source);
            return (
              <button
                key={article.id}
                onClick={() => handleSelect(article.id)}
                className="w-full text-left px-3 py-2.5 transition-colors"
                style={{
                  background: selectedId === article.id ? 'rgba(212,168,83,0.08)' : 'transparent',
                  borderLeft: selectedId === article.id ? '2px solid #d4a853' : '2px solid transparent',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={e => toggleStar(article.id, e)} className="shrink-0">
                    {article.starred ? <Star size={10} color="#d4a853" fill="#d4a853" /> : <StarOff size={10} color="#4b5563" />}
                  </button>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: feed?.color }} />
                  <span className="text-[10px] shrink-0" style={{ color: '#6b7280' }}>{feed?.label}</span>
                  {!article.read && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#3b82f6' }} />}
                </div>
                <div className={`text-xs leading-snug ${!article.read ? 'font-medium' : ''}`} style={{ color: '#d1d5db' }}>
                  {article.title}
                </div>
                <div className="text-[10px] mt-1 truncate" style={{ color: '#4b5563' }}>{article.excerpt}</div>
                <div className="text-[10px] mt-1" style={{ color: '#4b5563' }}>{article.date}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reading pane */}
      <div className="flex-1 overflow-auto p-6">
        {selected ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ background: FEEDS.find(f => f.id === selected.source)?.color }} />
              <span className="text-xs" style={{ color: '#6b7280' }}>{FEEDS.find(f => f.id === selected.source)?.label}</span>
              <span className="text-xs" style={{ color: '#4b5563' }}>· {selected.date}</span>
            </div>
            <h2 className="text-xl font-bold mb-4">{selected.title}</h2>
            <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#d1d5db' }}>
              {selected.content}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: '#4b5563' }}>
            <Newspaper size={48} />
            <p className="text-sm mt-2">Selecciona un articulo para leerlo</p>
          </div>
        )}
      </div>
    </div>
  );
}
