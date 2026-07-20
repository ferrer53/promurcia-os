import { useState, useMemo } from 'react';
import { Search, BookOpen, Clock, Star, Volume2 } from 'lucide-react';

interface DictEntry {
  word: string;
  pronunciation: string;
  pos: string; // part of speech
  definitions: string[];
  synonyms: string[];
  examples: string[];
}

const DICTIONARY: DictEntry[] = [
  { word: 'arras', pronunciation: '/ˈa.ras/', pos: 'sustantivo femenino', definitions: ['Senal que se da en el contrato de compraventa para confirmar el compromiso.', 'Cantidad entregada como anticipo en una transaccion inmobiliaria.'], synonyms: ['senal', 'anticipo', 'deposito'], examples: ['Se entregaron las arras para reservar el piso.', 'El contrato establece unas arras de 6.000 euros.'] },
  { word: 'hipoteca', pronunciation: '/iˈpoɾ.te.ka/', pos: 'sustantivo femenino', definitions: ['Derecho real que grava un inmueble para garantizar el cumplimiento de una obligacion.', 'Prestamo garantizado con un bien inmueble.'], synonyms: ['gravamen', 'prestamo', 'empenito'], examples: ['La hipoteca del piso tiene un tipo de interes del 3%.', 'Solicitamos una hipoteca a 30 anos.'] },
  { word: 'titularidad', pronunciation: '/ti.tu.laɾiˈðað/', pos: 'sustantivo femenino', definitions: ['Condicion de ser titular o dueno de algo.', 'Derecho de propiedad sobre un bien.'], synonyms: ['propiedad', 'dominio', 'posesion'], examples: ['La titularidad del inmueble esta a nombre de Juan Garcia.', 'Se comprobo la titularidad en el Registro de la Propiedad.'] },
  { word: 'tasacion', pronunciation: '/ta.saˈθjon/', pos: 'sustantivo femenino', definitions: ['Accion y efecto de tasar o determinar el valor de un bien.', 'Informe tecnico que establece el valor de mercado de una propiedad.'], synonyms: ['valoracion', 'peritaje', 'avaluo'], examples: ['La tasacion del piso fue de 185.000 euros.', 'El banco exige una tasacion actualizada.'] },
  { word: 'censo', pronunciation: '/ˈθen.so/', pos: 'sustantivo masculino', definitions: ['Relacion o padron de los habitantes de un lugar.', 'Registro oficial de personas que residen en una vivienda.'], synonyms: ['padron', 'registro', 'lista'], examples: ['El censo muestra un aumento de poblacion en Murcia.', 'Debes estar empadronado en el censo municipal.'] },
  { word: 'escritura', pronunciation: '/es.kɾiˈtu.ɾa/', pos: 'sustantivo femenino', definitions: ['Documento publico otorgado ante notario que acredita un acto juridico.', 'Acto de otorgar dicho documento.'], synonyms: ['acta', 'documento', 'titulo'], examples: ['La escritura de compraventa se firmo ante notario.', 'Firmamos la escritura el proximo martes.'] },
  { word: 'notaria', pronunciation: '/noˈta.ɾja/', pos: 'sustantivo femenino', definitions: ['Oficio del notario.', 'Despacho profesional de un notario.'], synonyms: ['protocolo', 'notariado'], examples: ['Acudimos a la notaria para firmar la escritura.', 'La notaria verifico todas las copias.'] },
  { word: 'registro', pronunciation: '/reˈxist.ɾo/', pos: 'sustantivo masculino', definitions: ['Oficio publico encargado de la inscripcion de bienes inmuebles.', 'Libro o archivo donde se inscriben los actos y contratos.'], synonyms: ['archivo', 'padron', 'fichero'], examples: ['La finca esta inscrita en el Registro de la Propiedad.', 'Solicitamos una nota simple del registro.'] },
  { word: 'plusvalia', pronunciation: '/plus.ˈβa.lja/', pos: 'sustantivo femenino', definitions: ['Incremento del valor de un bien.', 'Tributo municipal sobre el incremento del valor de los terrenos.'], synonyms: ['revalorizacion', 'apreciacion', 'ganancia'], examples: ['La plusvalia del inmueble ha sido del 20% en 5 anos.', 'Hay que pagar la plusvalia municipal al vender.'] },
  { word: 'dacion', pronunciation: '/daˈθjon/', pos: 'sustantivo femenino', definitions: ['Accion de dar o entregar algo.', 'Dacion en pago: entrega de la vivienda al banco para cancelar la deuda hipotecaria.'], synonyms: ['entrega', 'cesion', 'transferencia'], examples: ['Acordaron la dacion en pago del piso.', 'La dacion en pago evita el proceso judicial.'] },
  { word: 'usufructo', pronunciation: '/u.suˈfɾuk.to/', pos: 'sustantivo masculino', definitions: ['Derecho real a usar y disfrutar bienes ajenos con obligacion de conservar su forma y sustancia.'], synonyms: [' uso', 'disfrute', 'tenencia'], examples: ['La madre tiene el usufructo vitalicio de la vivienda.', 'El usufructo se extingue al fallecimiento del titular.'] },
  { word: 'propiedad', pronunciation: '/pɾo.pi.eˈðað/', pos: 'sustantivo femenino', definitions: ['Derecho real que confiere a su titular el goce y disposicion de un bien.', 'Cosa que pertenece a alguien.'], synonyms: ['posesion', 'dominio', 'titularidad'], examples: ['La propiedad del terreno pertenece a la familia desde 1980.', 'Se transfirio la propiedad a los nuevos duenos.'] },
  { word: 'arrendamiento', pronunciation: '/a.ɾen.daˈmjɛn.to/', pos: 'sustantivo masculino', definitions: ['Contrato por el que se cede el uso de un bien a cambio de un precio.', 'Accion de arrendar.'], synonyms: ['alquiler', 'arriendo', 'tenencia'], examples: ['El arrendamiento tiene una duracion de un ano.', 'Firmamos el contrato de arrendamiento.'] },
  { word: 'fianza', pronunciation: '/ˈfjan.θa/', pos: 'sustantivo femenino', definitions: ['Cantidad que el inquilino entrega al arrendador como garantia del cumplimiento del contrato.', 'Garantia para responder de una obligacion.'], synonyms: ['deposito', 'garantia', 'caucion'], examples: ['La fianza del alquiler equivale a un mes de renta.', 'Se devolvera la fianza al finalizar el contrato.'] },
  { word: 'desahucio', pronunciation: '/de.saˈu.θjo/', pos: 'sustantivo masculino', definitions: ['Accion de desalojar a un inquilino por incumplimiento del contrato de arrendamiento.', 'Resolucion judicial del contrato de alquiler.'], synonyms: ['desalojo', 'eviccion', ' lanzamiento'], examples: ['El propietario inicio el proceso de desahucio por impago.', 'El desahucio fue suspendido tras el pago de la deuda.'] },
  { word: 'inquilino', pronunciation: '/in.kiˈli.no/', pos: 'sustantivo', definitions: ['Persona que alquila y ocupa una vivienda o local.', 'Arrendatario de un inmueble.'], synonyms: ['arrendatario', 'locatario', 'inquilinato'], examples: ['El inquilino paga 700 euros mensuales de alquiler.', 'Los inquilinos renovaron el contrato por otro ano.'] },
  { word: 'arrendador', pronunciation: '/a.ɾen.daˈðoɾ/', pos: 'sustantivo', definitions: ['Persona que arrienda un bien inmueble.', 'Propietario que cede el uso de una vivienda mediante contrato de alquiler.'], synonyms: ['propietario', 'casero', 'locador'], examples: ['El arrendador exige una fianza de dos meses.', 'El arrendador se encarga de las reparaciones.'] },
  { word: 'comunidad', pronunciation: '/ko.mu.niˈðað/', pos: 'sustantivo femenino', definitions: ['Organo de gobierno de los propietarios de una finca dividida en propiedad horizontal.', 'Conjunto de propietarios de un edificio de apartamentos.'], synonyms: ['vecindad', 'propiedad horizontal', 'administracion'], examples: ['La comunidad de vecinos aprobo la reforma del portal.', 'La cuota de la comunidad asciende a 80 euros mensuales.'] },
  { word: 'IBI', pronunciation: '/ˈi.βi/', pos: 'siglas', definitions: ['Impuesto sobre Bienes Inmuebles. Tributo municipal que grava la titularidad de bienes inmuebles.'], synonyms: ['impuesto municipal', 'contribucion'], examples: ['El IBI de la vivienda asciende a 450 euros anuales.', 'Hay que pagar el IBI antes de finalizar el ano.'] },
  { word: 'valor catastral', pronunciation: '/ˈba.loɾ ka.tasˈtɾal/', pos: 'locucion', definitions: ['Valor administrativo que se le asigna a un inmueble para la aplicacion de tributos.', 'Base imponible para el calculo del IBI.'], synonyms: ['valor fiscal', 'valor administrativo'], examples: ['El valor catastral del piso es de 120.000 euros.', 'El valor catastral se revisa periodicamente.'] },
];

const WORD_OF_DAY = DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)];

export default function Dictionary() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<DictEntry | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return DICTIONARY.filter(e => e.word.toLowerCase().includes(q) || e.definitions.some(d => d.toLowerCase().includes(q)));
  }, [query]);

  const handleSelect = (entry: DictEntry) => {
    setSelected(entry);
    setHistory(prev => [entry.word, ...prev.filter(w => w !== entry.word)].slice(0, 10));
  };

  return (
    <div className="flex h-full w-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Left sidebar */}
      <div className="w-64 shrink-0 border-r flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#111d32' }}>
        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search size={14} color="#6b7280" className="absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar termino..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto px-2">
          {query ? (
            <div className="space-y-0.5">
              {results.map(r => (
                <button
                  key={r.word}
                  onClick={() => handleSelect(r)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                  style={{
                    background: selected?.word === r.word ? 'rgba(212,168,83,0.1)' : 'transparent',
                    color: selected?.word === r.word ? '#d4a853' : '#d1d5db',
                  }}
                >
                  <div className="font-medium">{r.word}</div>
                  <div className="truncate" style={{ color: '#6b7280' }}>{r.definitions[0]}</div>
                </button>
              ))}
              {results.length === 0 && <div className="text-xs text-center py-4" style={{ color: '#4b5563' }}>Sin resultados</div>}
            </div>
          ) : (
            <>
              {/* Word of the day */}
              <div className="mx-2 mb-4 p-3 rounded-lg" style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.15)' }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#d4a853' }}>Palabra del dia</div>
                <button onClick={() => handleSelect(WORD_OF_DAY)} className="text-sm font-bold" style={{ color: '#d4a853' }}>{WORD_OF_DAY.word}</button>
                <div className="text-[10px] mt-1" style={{ color: '#9ca3af' }}>{WORD_OF_DAY.definitions[0].substring(0, 60)}...</div>
              </div>

              {/* History */}
              {history.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider px-3 mb-1" style={{ color: '#6b7280' }}>Historial</div>
                  {history.map(h => {
                    const entry = DICTIONARY.find(d => d.word === h);
                    return entry ? (
                      <button
                        key={h}
                        onClick={() => handleSelect(entry)}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-all"
                        style={{ color: '#9ca3af' }}
                      >
                        <Clock size={10} />
                        {h}
                      </button>
                    ) : null;
                  })}
                </div>
              )}

              {/* All words */}
              <div>
                <div className="text-[10px] uppercase tracking-wider px-3 mb-1" style={{ color: '#6b7280' }}>Terminos ({DICTIONARY.length})</div>
                {DICTIONARY.map(d => (
                  <button
                    key={d.word}
                    onClick={() => handleSelect(d)}
                    className="w-full text-left px-3 py-1.5 text-xs transition-all hover:text-[#d4a853]"
                    style={{ color: selected?.word === d.word ? '#d4a853' : '#9ca3af' }}
                  >
                    {d.word}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Definition pane */}
      <div className="flex-1 overflow-auto p-6">
        {selected ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold">{selected.word}</h2>
              <span className="text-sm font-mono" style={{ color: '#6b7280' }}>{selected.pronunciation}</span>
              <button className="p-1.5 rounded hover:bg-white/5">
                <Volume2 size={14} color="#d4a853" />
              </button>
            </div>
            <div className="text-xs px-2 py-1 rounded-full inline-block mb-4" style={{ background: 'rgba(212,168,83,0.1)', color: '#d4a853' }}>
              {selected.pos}
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6b7280' }}>Definiciones</h3>
              <ol className="space-y-2">
                {selected.definitions.map((def, i) => (
                  <li key={i} className="text-sm leading-relaxed pl-4" style={{ color: '#d1d5db', borderLeft: '2px solid rgba(212,168,83,0.3)' }}>
                    {def}
                  </li>
                ))}
              </ol>
            </div>

            {selected.synonyms.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6b7280' }}>Sinonimos</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.synonyms.map(s => (
                    <span key={s} className="text-xs px-2 py-1 rounded-full" style={{ background: '#1a2744', color: '#9ca3af' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6b7280' }}>Ejemplos</h3>
              <div className="space-y-2">
                {selected.examples.map((ex, i) => (
                  <div key={i} className="text-sm italic pl-4" style={{ color: '#9ca3af', borderLeft: '2px solid rgba(59,130,246,0.3)' }}>
                    "{ex}"
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: '#4b5563' }}>
            <BookOpen size={48} />
            <p className="text-sm mt-2">Busca un termino o selecciona uno de la lista</p>
          </div>
        )}
      </div>
    </div>
  );
}
