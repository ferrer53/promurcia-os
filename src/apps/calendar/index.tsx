import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  color: string;
  description: string;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const DAYS_SHORT = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const EVENT_COLORS: Record<string, string> = {
  reunion: '#d4a853',
  visita: '#06b6d4',
  llamada: '#22c55e',
  personal: '#8b5cf6',
  recordatorio: '#f59e0b',
};

const EVENT_COLOR_LABELS = [
  { value: 'reunion', label: 'Reunion' },
  { value: 'visita', label: 'Visita' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'personal', label: 'Personal' },
  { value: 'recordatorio', label: 'Recordatorio' },
];

export default function CalendarApp() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: '1', title: 'Reunion equipo', date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`, time: '10:00', color: 'reunion', description: 'Reunion semanal' },
    { id: '2', title: 'Visita propiedad', date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(Math.min(today.getDate() + 2, 28)).padStart(2, '0')}`, time: '14:30', color: 'visita', description: 'Visita PRO-123' },
    { id: '3', title: 'Llamada Juan Garcia', date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`, time: '17:00', color: 'llamada', description: 'Seguimiento lead' },
    { id: '4', title: 'Cumpleanos Ana', date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-15`, time: '00:00', color: 'personal', description: '' },
    { id: '5', title: 'Revision contrato', date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(Math.min(today.getDate() + 5, 28)).padStart(2, '0')}`, time: '09:00', color: 'recordatorio', description: 'Revision arras' },
  ]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('09:00');
  const [eventColor, setEventColor] = useState('reunion');
  const [eventDesc, setEventDesc] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  };

  const getEventsForDate = (dateStr: string) => events.filter(e => e.date === dateStr);

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const handleAddEvent = () => {
    if (!eventTitle.trim()) return;
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: eventTitle,
      date: selectedDate,
      time: eventTime,
      color: eventColor,
      description: eventDesc,
    };
    setEvents(prev => [...prev, newEvent]);
    setEventTitle('');
    setEventTime('09:00');
    setEventDesc('');
    setShowEventForm(false);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const calendarDays = useMemo(() => {
    const days: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      days.push({ day: d, isCurrentMonth: false, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, isCurrentMonth: true, dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      days.push({ day: d, isCurrentMonth: false, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    return days;
  }, [year, month, startOffset, daysInMonth]);

  const selectedEvents = getEventsForDate(selectedDate);
  const selectedDayObj = new Date(selectedDate + 'T12:00:00');

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a1628' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1 rounded-md hover:bg-[#1a2744] text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-white font-semibold text-base min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-1 rounded-md hover:bg-[#1a2744] text-gray-400 hover:text-white transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-3 py-1 rounded-md text-xs text-[#d4a853] hover:bg-[#1a2744] transition-colors border border-[#d4a853]/20">
            Hoy
          </button>
          <div className="flex rounded-md overflow-hidden border border-white/10">
            {([['month', 'Mes'], ['week', 'Sem'], ['day', 'Dia']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs transition-colors ${view === v ? 'bg-[#d4a853] text-[#0a1628] font-medium' : 'text-gray-400 hover:bg-[#1a2744]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowEventForm(true)} className="ml-2 p-1.5 rounded-md bg-[#d4a853] text-[#0a1628] hover:brightness-110 transition-all">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Calendar */}
        <div className="flex-1 flex flex-col overflow-auto p-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1 shrink-0">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-[11px] text-gray-500 font-medium uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1 flex-1">
            {calendarDays.map((dayInfo, i) => {
              const isToday = dayInfo.dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const isSelected = dayInfo.dateStr === selectedDate;
              const dayEvents = getEventsForDate(dayInfo.dateStr);

              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(dayInfo.day)}
                  className={`relative flex flex-col items-start p-1 rounded-lg transition-all duration-150 text-left ${
                    isSelected ? 'bg-[rgba(212,168,83,0.15)] ring-1 ring-[#d4a853]' :
                    isToday ? 'bg-[rgba(212,168,83,0.08)]' :
                    'hover:bg-[rgba(255,255,255,0.04)]'
                  } ${!dayInfo.isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  <span className={`text-sm font-medium ${isToday ? 'text-[#d4a853]' : 'text-gray-300'}`}>
                    {dayInfo.day}
                  </span>
                  <div className="flex gap-0.5 mt-auto flex-wrap">
                    {dayEvents.slice(0, 3).map((e, j) => (
                      <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: EVENT_COLORS[e.color] }} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-gray-500 leading-none">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar - Mini Calendar + Events */}
        <div className="w-64 shrink-0 p-3 overflow-auto" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#0d1b2a' }}>
          {/* Mini month view */}
          <div className="mb-4">
            <h3 className="text-white font-medium text-sm mb-2">
              {DAYS_FULL[selectedDayObj.getDay()]}, {selectedDayObj.getDate()} de {MONTHS[selectedDayObj.getMonth()]}
            </h3>
          </div>

          {/* Events for selected day */}
          <div className="mb-3">
            <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Eventos ({selectedEvents.length})
            </h4>
            {selectedEvents.length === 0 ? (
              <p className="text-xs text-gray-600">Sin eventos</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map(event => (
                  <div key={event.id} className="p-2 rounded-lg" style={{ background: `${EVENT_COLORS[event.color]}15`, borderLeft: `3px solid ${EVENT_COLORS[event.color]}` }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} style={{ color: EVENT_COLORS[event.color] }} />
                        <span className="text-[10px] text-gray-400">{event.time}</span>
                      </div>
                      <button onClick={() => handleDeleteEvent(event.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                        <X size={10} />
                      </button>
                    </div>
                    <p className="text-xs text-white font-medium mt-0.5">{event.title}</p>
                    {event.description && <p className="text-[10px] text-gray-500 mt-0.5">{event.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming events */}
          <div>
            <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Proximos eventos</h4>
            <div className="space-y-1.5">
              {events
                .filter(e => e.date >= `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 5)
                .map(event => {
                  const [y, m, d] = event.date.split('-').map(Number);
                  return (
                    <div key={event.id} className="flex items-center gap-2 py-1">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: EVENT_COLORS[event.color] }} />
                      <span className="text-[11px] text-gray-400 shrink-0">{d}/{m}</span>
                      <span className="text-[11px] text-gray-300 truncate">{event.title}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-5 w-80" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Nuevo Evento</h3>
              <button onClick={() => setShowEventForm(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Titulo</label>
                <input value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="Titulo del evento" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Hora</label>
                  <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Tipo</label>
                  <select value={eventColor} onChange={e => setEventColor(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {EVENT_COLOR_LABELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Descripcion</label>
                <textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none resize-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', minHeight: 60 }} placeholder="Descripcion opcional" />
              </div>
              <button onClick={handleAddEvent} className="w-full py-2 rounded-md bg-[#d4a853] text-[#0a1628] font-medium text-sm hover:brightness-110 transition-all">
                Crear Evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
