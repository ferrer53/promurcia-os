import { useState, useMemo } from 'react';
import { Search, Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, Eye, Thermometer, Gauge, CloudLightning, CloudSun } from 'lucide-react';

interface WeatherData {
  city: string;
  country: string;
  temp: number;
  condition: string;
  humidity: number;
  wind: number;
  pressure: number;
  uv: number;
  visibility: number;
  feelsLike: number;
  maxTemp: number;
  minTemp: number;
  icon: 'sun' | 'cloud' | 'rain' | 'snow' | 'storm' | 'cloudsun';
  forecast: { day: string; icon: string; max: number; min: number; condition: string }[];
  hourly: { time: string; temp: number; icon: string }[];
}

const WEATHER_DATA: Record<string, WeatherData> = {
  murcia: {
    city: 'Murcia', country: 'Espana', temp: 22, condition: 'Soleado', humidity: 45, wind: 12, pressure: 1015, uv: 6, visibility: 20, feelsLike: 24, maxTemp: 26, minTemp: 14,
    icon: 'sun',
    forecast: [
      { day: 'Lun', icon: 'sun', max: 24, min: 14, condition: 'Soleado' },
      { day: 'Mar', icon: 'cloudsun', max: 23, min: 13, condition: 'Parcialmente nublado' },
      { day: 'Mie', icon: 'cloud', max: 21, min: 12, condition: 'Nublado' },
      { day: 'Jue', icon: 'sun', max: 25, min: 15, condition: 'Soleado' },
      { day: 'Vie', icon: 'sun', max: 27, min: 16, condition: 'Soleado' },
    ],
    hourly: [
      { time: '08:00', temp: 16, icon: 'sun' }, { time: '09:00', temp: 18, icon: 'sun' },
      { time: '10:00', temp: 20, icon: 'sun' }, { time: '11:00', temp: 21, icon: 'sun' },
      { time: '12:00', temp: 22, icon: 'sun' }, { time: '13:00', temp: 24, icon: 'sun' },
      { time: '14:00', temp: 25, icon: 'sun' }, { time: '15:00', temp: 26, icon: 'sun' },
      { time: '16:00', temp: 25, icon: 'sun' }, { time: '17:00', temp: 24, icon: 'cloudsun' },
      { time: '18:00', temp: 22, icon: 'cloudsun' }, { time: '19:00', temp: 20, icon: 'cloud' },
    ],
  },
  madrid: {
    city: 'Madrid', country: 'Espana', temp: 18, condition: 'Parcialmente nublado', humidity: 52, wind: 18, pressure: 1012, uv: 4, visibility: 15, feelsLike: 17, maxTemp: 20, minTemp: 10,
    icon: 'cloudsun',
    forecast: [
      { day: 'Lun', icon: 'cloudsun', max: 20, min: 10, condition: 'Parcialmente nublado' },
      { day: 'Mar', icon: 'cloud', max: 18, min: 9, condition: 'Nublado' },
      { day: 'Mie', icon: 'rain', max: 15, min: 8, condition: 'Lluvia' },
      { day: 'Jue', icon: 'cloudsun', max: 19, min: 11, condition: 'Parcialmente nublado' },
      { day: 'Vie', icon: 'sun', max: 22, min: 12, condition: 'Soleado' },
    ],
    hourly: [
      { time: '08:00', temp: 11, icon: 'cloud' }, { time: '09:00', temp: 13, icon: 'cloudsun' },
      { time: '10:00', temp: 15, icon: 'cloudsun' }, { time: '11:00', temp: 17, icon: 'sun' },
      { time: '12:00', temp: 18, icon: 'sun' }, { time: '13:00', temp: 19, icon: 'sun' },
      { time: '14:00', temp: 20, icon: 'sun' }, { time: '15:00', temp: 20, icon: 'cloudsun' },
      { time: '16:00', temp: 19, icon: 'cloud' }, { time: '17:00', temp: 17, icon: 'cloud' },
      { time: '18:00', temp: 15, icon: 'cloud' }, { time: '19:00', temp: 13, icon: 'cloud' },
    ],
  },
  barcelona: {
    city: 'Barcelona', country: 'Espana', temp: 16, condition: 'Lluvia', humidity: 78, wind: 22, pressure: 1008, uv: 2, visibility: 10, feelsLike: 14, maxTemp: 18, minTemp: 12,
    icon: 'rain',
    forecast: [
      { day: 'Lun', icon: 'rain', max: 18, min: 12, condition: 'Lluvia' },
      { day: 'Mar', icon: 'rain', max: 17, min: 11, condition: 'Lluvia' },
      { day: 'Mie', icon: 'cloud', max: 19, min: 13, condition: 'Nublado' },
      { day: 'Jue', icon: 'cloudsun', max: 21, min: 14, condition: 'Parcialmente nublado' },
      { day: 'Vie', icon: 'sun', max: 23, min: 15, condition: 'Soleado' },
    ],
    hourly: [
      { time: '08:00', temp: 13, icon: 'rain' }, { time: '09:00', temp: 13, icon: 'rain' },
      { time: '10:00', temp: 14, icon: 'rain' }, { time: '11:00', temp: 15, icon: 'cloud' },
      { time: '12:00', temp: 16, icon: 'cloud' }, { time: '13:00', temp: 17, icon: 'cloudsun' },
      { time: '14:00', temp: 18, icon: 'cloudsun' }, { time: '15:00', temp: 18, icon: 'cloudsun' },
      { time: '16:00', temp: 17, icon: 'cloud' }, { time: '17:00', temp: 16, icon: 'rain' },
      { time: '18:00', temp: 15, icon: 'rain' }, { time: '19:00', temp: 14, icon: 'rain' },
    ],
  },
  valencia: {
    city: 'Valencia', country: 'Espana', temp: 23, condition: 'Soleado', humidity: 55, wind: 15, pressure: 1014, uv: 5, visibility: 18, feelsLike: 25, maxTemp: 25, minTemp: 16,
    icon: 'sun',
    forecast: [
      { day: 'Lun', icon: 'sun', max: 25, min: 16, condition: 'Soleado' },
      { day: 'Mar', icon: 'sun', max: 26, min: 17, condition: 'Soleado' },
      { day: 'Mie', icon: 'cloudsun', max: 24, min: 16, condition: 'Parcialmente nublado' },
      { day: 'Jue', icon: 'cloudsun', max: 23, min: 15, condition: 'Parcialmente nublado' },
      { day: 'Vie', icon: 'sun', max: 27, min: 18, condition: 'Soleado' },
    ],
    hourly: [
      { time: '08:00', temp: 17, icon: 'sun' }, { time: '09:00', temp: 19, icon: 'sun' },
      { time: '10:00', temp: 21, icon: 'sun' }, { time: '11:00', temp: 22, icon: 'sun' },
      { time: '12:00', temp: 23, icon: 'sun' }, { time: '13:00', temp: 24, icon: 'sun' },
      { time: '14:00', temp: 25, icon: 'sun' }, { time: '15:00', temp: 25, icon: 'sun' },
      { time: '16:00', temp: 24, icon: 'sun' }, { time: '17:00', temp: 23, icon: 'cloudsun' },
      { time: '18:00', temp: 21, icon: 'cloudsun' }, { time: '19:00', temp: 19, icon: 'cloud' },
    ],
  },
  sevilla: {
    city: 'Sevilla', country: 'Espana', temp: 25, condition: 'Soleado', humidity: 35, wind: 10, pressure: 1018, uv: 7, visibility: 22, feelsLike: 27, maxTemp: 28, minTemp: 15,
    icon: 'sun',
    forecast: [
      { day: 'Lun', icon: 'sun', max: 28, min: 15, condition: 'Soleado' },
      { day: 'Mar', icon: 'sun', max: 29, min: 16, condition: 'Soleado' },
      { day: 'Mie', icon: 'sun', max: 30, min: 17, condition: 'Soleado' },
      { day: 'Jue', icon: 'cloudsun', max: 27, min: 16, condition: 'Parcialmente nublado' },
      { day: 'Vie', icon: 'sun', max: 31, min: 18, condition: 'Soleado' },
    ],
    hourly: [
      { time: '08:00', temp: 16, icon: 'sun' }, { time: '09:00', temp: 19, icon: 'sun' },
      { time: '10:00', temp: 22, icon: 'sun' }, { time: '11:00', temp: 24, icon: 'sun' },
      { time: '12:00', temp: 25, icon: 'sun' }, { time: '13:00', temp: 27, icon: 'sun' },
      { time: '14:00', temp: 28, icon: 'sun' }, { time: '15:00', temp: 28, icon: 'sun' },
      { time: '16:00', temp: 27, icon: 'sun' }, { time: '17:00', temp: 26, icon: 'sun' },
      { time: '18:00', temp: 24, icon: 'sun' }, { time: '19:00', temp: 21, icon: 'sun' },
    ],
  },
};

function WeatherIcon({ icon, size = 24 }: { icon: string; size?: number }) {
  const props = { size, strokeWidth: 1.5 };
  switch (icon) {
    case 'sun': return <Sun {...props} className="text-yellow-400" />;
    case 'cloud': return <Cloud {...props} className="text-gray-400" />;
    case 'rain': return <CloudRain {...props} className="text-blue-400" />;
    case 'snow': return <CloudSnow {...props} className="text-cyan-200" />;
    case 'storm': return <CloudLightning {...props} className="text-purple-400" />;
    case 'cloudsun': return <CloudSun {...props} className="text-yellow-300" />;
    default: return <Sun {...props} className="text-yellow-400" />;
  }
}

export default function Weather() {
  const [city, setCity] = useState('murcia');
  const [searchInput, setSearchInput] = useState('');

  const data = WEATHER_DATA[city] || WEATHER_DATA.murcia;

  const handleSearch = () => {
    const key = searchInput.toLowerCase().trim();
    if (WEATHER_DATA[key]) {
      setCity(key);
      setSearchInput('');
    }
  };

  const bgStyle = useMemo(() => {
    switch (data.icon) {
      case 'sun': return { background: 'linear-gradient(180deg, #0a1628 0%, #1a2744 50%, #0a1628 100%)' };
      case 'cloud': return { background: 'linear-gradient(180deg, #0a1628 0%, #1e293b 50%, #0a1628 100%)' };
      case 'rain': return { background: 'linear-gradient(180deg, #0a1628 0%, #162d4a 50%, #0a1628 100%)' };
      case 'cloudsun': return { background: 'linear-gradient(180deg, #0a1628 0%, #1d3050 50%, #0a1628 100%)' };
      default: return { background: '#0a1628' };
    }
  }, [data.icon]);

  return (
    <div className="flex flex-col h-full overflow-auto" style={bgStyle}>
      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={14} className="text-gray-500 shrink-0" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="bg-transparent text-sm text-white outline-none w-full placeholder-gray-600"
            placeholder="Buscar ciudad (murcia, madrid, barcelona...)"
          />
        </div>
        <button onClick={handleSearch} className="px-3 py-2 rounded-full bg-[#d4a853] text-[#0a1628] text-xs font-medium hover:brightness-110 transition-all">
          Buscar
        </button>
      </div>

      {/* Current weather */}
      <div className="flex flex-col items-center px-4 py-2">
        <h2 className="text-white text-lg font-medium">{data.city}, {data.country}</h2>
        <div className="mt-4 mb-2 animate-bounce" style={{ animation: 'float 3s ease-in-out infinite' }}>
          <WeatherIcon icon={data.icon} size={72} />
        </div>
        <div className="text-5xl font-light text-white mb-1">{data.temp}°</div>
        <div className="text-sm text-gray-400 mb-4">{data.condition}</div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-xs mb-4">
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Thermometer size={14} className="text-orange-400" />
            <div><p className="text-[10px] text-gray-500">Sensacion</p><p className="text-xs text-white">{data.feelsLike}°C</p></div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Droplets size={14} className="text-blue-400" />
            <div><p className="text-[10px] text-gray-500">Humedad</p><p className="text-xs text-white">{data.humidity}%</p></div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Wind size={14} className="text-cyan-400" />
            <div><p className="text-[10px] text-gray-500">Viento</p><p className="text-xs text-white">{data.wind} km/h</p></div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Gauge size={14} className="text-green-400" />
            <div><p className="text-[10px] text-gray-500">Presion</p><p className="text-xs text-white">{data.pressure} hPa</p></div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Sun size={14} className="text-yellow-400" />
            <div><p className="text-[10px] text-gray-500">UV</p><p className="text-xs text-white">{data.uv} ({data.uv >= 6 ? 'Alto' : data.uv >= 3 ? 'Moderado' : 'Bajo'})</p></div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Eye size={14} className="text-purple-400" />
            <div><p className="text-[10px] text-gray-500">Visibilidad</p><p className="text-xs text-white">{data.visibility} km</p></div>
          </div>
        </div>

        {/* Min/Max */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-xs text-gray-400">Max: <span className="text-white font-medium">{data.maxTemp}°</span></span>
          <span className="text-xs text-gray-400">Min: <span className="text-white font-medium">{data.minTemp}°</span></span>
        </div>
      </div>

      {/* Hourly forecast */}
      <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Pronostico por horas</h3>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {data.hourly.map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-1 shrink-0 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-[10px] text-gray-500">{h.time}</span>
              <WeatherIcon icon={h.icon} size={14} />
              <span className="text-xs text-white">{h.temp}°</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5-day forecast */}
      <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Pronostico 5 dias</h3>
        <div className="flex justify-between gap-2">
          {data.forecast.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-[10px] text-gray-500">{day.day}</span>
              <WeatherIcon icon={day.icon} size={18} />
              <span className="text-xs text-white font-medium">{day.max}°</span>
              <span className="text-[10px] text-gray-500">{day.min}°</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
