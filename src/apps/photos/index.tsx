import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Play, Pause, Info, Grid3X3 } from 'lucide-react';

interface Photo {
  id: string;
  label: string;
  gradient: string;
  width: number;
  height: number;
  date: string;
  filename: string;
}

const PHOTOS: Photo[] = [
  { id: '1', label: 'Salon', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', width: 1920, height: 1080, date: '2026-02-10', filename: 'IMG_salon_01.jpg' },
  { id: '2', label: 'Cocina', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', width: 1920, height: 1080, date: '2026-02-10', filename: 'IMG_cocina_02.jpg' },
  { id: '3', label: 'Dormitorio Principal', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', width: 1600, height: 1200, date: '2026-02-09', filename: 'IMG_dormitorio_03.jpg' },
  { id: '4', label: 'Bano', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', width: 1920, height: 1080, date: '2026-02-09', filename: 'IMG_bano_04.jpg' },
  { id: '5', label: 'Terraza', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', width: 1920, height: 1080, date: '2026-02-08', filename: 'IMG_terraza_05.jpg' },
  { id: '6', label: 'Fachada', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', width: 1600, height: 1200, date: '2026-02-08', filename: 'IMG_fachada_06.jpg' },
  { id: '7', label: 'Jardin', gradient: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)', width: 1920, height: 1080, date: '2026-02-07', filename: 'IMG_jardin_07.jpg' },
  { id: '8', label: 'Piscina', gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', width: 1920, height: 1080, date: '2026-02-07', filename: 'IMG_piscina_08.jpg' },
  { id: '9', label: 'Garaje', gradient: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)', width: 1600, height: 1200, date: '2026-02-06', filename: 'IMG_garaje_09.jpg' },
  { id: '10', label: 'Despacho', gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', width: 1920, height: 1080, date: '2026-02-06', filename: 'IMG_despacho_10.jpg' },
  { id: '11', label: 'Sotano', gradient: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', width: 1920, height: 1080, date: '2026-02-05', filename: 'IMG_sotano_11.jpg' },
  { id: '12', label: 'Vestibulo', gradient: 'linear-gradient(135deg, #fdcbf1 0%, #e6dee9 100%)', width: 1600, height: 1200, date: '2026-02-05', filename: 'IMG_vestibulo_12.jpg' },
];

export default function Photos() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(100);
  const [slideshow, setSlideshow] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const selectedPhoto = selectedIndex !== null ? PHOTOS[selectedIndex] : null;

  useEffect(() => {
    if (!slideshow || selectedIndex === null) return;
    const timer = setInterval(() => {
      setSelectedIndex(prev => (prev !== null ? (prev + 1) % PHOTOS.length : 0));
    }, 3000);
    return () => clearInterval(timer);
  }, [slideshow, selectedIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (selectedIndex === null) return;
    if (e.key === 'Escape') { setSelectedIndex(null); setSlideshow(false); }
    else if (e.key === 'ArrowLeft') setSelectedIndex(prev => (prev !== null ? (prev - 1 + PHOTOS.length) % PHOTOS.length : 0));
    else if (e.key === 'ArrowRight') setSelectedIndex(prev => (prev !== null ? (prev + 1) % PHOTOS.length : 0));
    else if (e.key === '+' || e.key === '=') setZoom(z => Math.min(200, z + 25));
    else if (e.key === '-') setZoom(z => Math.max(50, z - 25));
  }, [selectedIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a1628' }}>
      {/* Gallery grid */}
      {selectedIndex === null ? (
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            {PHOTOS.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setSelectedIndex(index)}
                className="group relative rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
                style={{ aspectRatio: '16/10' }}
              >
                <div className="absolute inset-0" style={{ background: photo.gradient }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-sm font-semibold drop-shadow-lg opacity-80 group-hover:opacity-100 transition-opacity">
                    {photo.label}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
                  <span className="text-[10px] text-white/70">{photo.filename}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Lightbox */
        <div className="absolute inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.92)' }}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => { setSelectedIndex(null); setSlideshow(false); setZoom(100); }} className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <Grid3X3 size={18} />
              </button>
              <span className="text-xs text-white/60">{selectedPhoto?.filename}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <ZoomOut size={16} />
              </button>
              <span className="text-xs text-white/60 min-w-[36px] text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <ZoomIn size={16} />
              </button>
              <button onClick={() => setSlideshow(!slideshow)} className={`p-2 rounded-lg transition-colors ${slideshow ? 'text-[#d4a853] bg-[#d4a853]/20' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                {slideshow ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={() => setShowInfo(!showInfo)} className={`p-2 rounded-lg transition-colors ${showInfo ? 'text-[#d4a853] bg-[#d4a853]/20' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <Info size={16} />
              </button>
              <button onClick={() => { setSelectedIndex(null); setSlideshow(false); setZoom(100); }} className="p-2 rounded-lg hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Image area */}
          <div className="flex-1 flex items-center justify-center overflow-hidden relative">
            {/* Navigation arrows */}
            <button
              onClick={() => setSelectedIndex(prev => (prev !== null ? (prev - 1 + PHOTOS.length) % PHOTOS.length : 0))}
              className="absolute left-4 z-10 p-3 rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-black/50 transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => setSelectedIndex(prev => (prev !== null ? (prev + 1) % PHOTOS.length : 0))}
              className="absolute right-4 z-10 p-3 rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-black/50 transition-all"
            >
              <ChevronRight size={24} />
            </button>

            {/* Photo display */}
            {selectedPhoto && (
              <div
                className="rounded-lg shadow-2xl transition-transform duration-200"
                style={{
                  background: selectedPhoto.gradient,
                  width: `${Math.min(800 * zoom / 100, 800)}px`,
                  height: `${Math.min(500 * zoom / 100, 500)}px`,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="text-white text-2xl font-bold drop-shadow-lg">{selectedPhoto.label}</span>
              </div>
            )}

            {/* Info panel */}
            {showInfo && selectedPhoto && (
              <div className="absolute right-20 top-4 rounded-lg p-4 w-56" style={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-white font-medium text-sm mb-3">Informacion</h3>
                <div className="space-y-2">
                  <div><p className="text-[10px] text-gray-500 uppercase">Nombre</p><p className="text-xs text-white">{selectedPhoto.filename}</p></div>
                  <div><p className="text-[10px] text-gray-500 uppercase">Dimensiones</p><p className="text-xs text-white">{selectedPhoto.width} x {selectedPhoto.height}</p></div>
                  <div><p className="text-[10px] text-gray-500 uppercase">Fecha</p><p className="text-xs text-white">{selectedPhoto.date}</p></div>
                  <div><p className="text-[10px] text-gray-500 uppercase">Tipo</p><p className="text-xs text-white">JPEG</p></div>
                </div>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 overflow-x-auto" style={{ background: 'rgba(0,0,0,0.5)' }}>
            {PHOTOS.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setSelectedIndex(i)}
                className={`shrink-0 rounded overflow-hidden transition-all ${selectedIndex === i ? 'ring-2 ring-[#d4a853] scale-105' : 'opacity-50 hover:opacity-80'}`}
                style={{ width: 60, height: 40, background: photo.gradient }}
              >
                <span className="text-[8px] text-white/80">{photo.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
