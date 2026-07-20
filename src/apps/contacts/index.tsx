import { useState, useMemo } from 'react';
import { Search, Plus, X, Phone, Mail, MapPin, Tag, User, Edit2, Trash2, Upload, Download } from 'lucide-react';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  group: string;
}

const GROUPS = ['Familia', 'Amigos', 'Trabajo', 'Clientes', 'Proveedores'];
const GROUP_COLORS: Record<string, string> = {
  Familia: '#ef4444',
  Amigos: '#22c55e',
  Trabajo: '#3b82f6',
  Clientes: '#d4a853',
  Proveedores: '#8b5cf6',
};

const INITIAL_CONTACTS: Contact[] = [
  { id: '1', firstName: 'Ana', lastName: 'Lopez Garcia', phone: '+34 612 345 678', email: 'ana.lopez@email.com', address: 'Calle Mayor 12, Murcia', notes: 'Cliente interesada en pisos centro', group: 'Clientes' },
  { id: '2', firstName: 'Carlos', lastName: 'Ruiz Martinez', phone: '+34 623 456 789', email: 'c.ruiz@empresa.es', address: 'Av. Libertad 45, Madrid', notes: 'Proveedor materiales construccion', group: 'Proveedores' },
  { id: '3', firstName: 'Maria', lastName: 'Sanchez Torres', phone: '+34 634 567 890', email: 'msanchez@email.com', address: 'Plaza Espana 8, Valencia', notes: 'Lead cualificado - busca chalet', group: 'Clientes' },
  { id: '4', firstName: 'Javier', lastName: 'Fernandez Lopez', phone: '+34 645 678 901', email: 'javi.f@email.com', address: 'Calle Sol 23, Murcia', notes: '', group: 'Amigos' },
  { id: '5', firstName: 'Carmen', lastName: 'Gonzalez Ruiz', phone: '+34 656 789 012', email: 'carmen.g@empresa.es', address: 'Av. del Mar 67, Barcelona', notes: 'Agente colaborador', group: 'Trabajo' },
  { id: '6', firstName: 'Roberto', lastName: 'Martin Diaz', phone: '+34 667 890 123', email: 'roberto.m@email.com', address: 'Calle Luna 34, Sevilla', notes: 'Interesado en alquiler', group: 'Clientes' },
  { id: '7', firstName: 'Patricia', lastName: 'Navarro Gil', phone: '+34 678 901 234', email: 'patri.ng@email.com', address: 'Paseo Castellana 89, Madrid', notes: '', group: 'Familia' },
  { id: '8', firstName: 'Luis', lastName: 'Hernandez Perez', phone: '+34 689 012 345', email: 'luis.h@constructora.es', address: 'Calle Industria 56, Murcia', notes: 'Constructora Hernandez', group: 'Proveedores' },
  { id: '9', firstName: 'Elena', lastName: 'Diaz Moreno', phone: '+34 690 123 456', email: 'elena.d@email.com', address: 'Av. Juan Carlos I 12, Murcia', notes: 'Busca atico con terraza', group: 'Clientes' },
  { id: '10', firstName: 'Miguel', lastName: 'Romero Santos', phone: '+34 611 222 333', email: 'miguel.r@email.com', address: 'Calle Real 78, Zaragoza', notes: '', group: 'Amigos' },
  { id: '11', firstName: 'Isabel', lastName: 'Jimenez Vega', phone: '+34 622 333 444', email: 'isabel.j@inmobiliaria.es', address: 'Plaza Mayor 5, Murcia', notes: 'Agente inmobiliario colaborador', group: 'Trabajo' },
  { id: '12', firstName: 'Antonio', lastName: 'Moreno Castro', phone: '+34 633 444 555', email: 'antonio.m@email.com', address: 'Calle Nueva 90, Alicante', notes: 'Vende piso heredado', group: 'Clientes' },
  { id: '13', firstName: 'Laura', lastName: 'Alvarez Rey', phone: '+34 644 555 666', email: 'laura.a@email.com', address: 'Av. Principal 11, Murcia', notes: '', group: 'Familia' },
  { id: '14', firstName: 'Pedro', lastName: 'Castro Moya', phone: '+34 655 666 777', email: 'pedro.c@abogados.es', address: 'Calle Justicia 22, Murcia', notes: 'Abogado para contratos', group: 'Proveedores' },
  { id: '15', firstName: 'Sofia', lastName: 'Moya Vidal', phone: '+34 666 777 888', email: 'sofia.m@email.com', address: 'Paseo Maritimo 33, Malaga', notes: 'Interesada en segunda residencia', group: 'Clientes' },
];

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('1');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState('Todas');

  const [formData, setFormData] = useState<Partial<Contact>>({
    firstName: '', lastName: '', phone: '', email: '', address: '', notes: '', group: 'Clientes',
  });

  const selectedContact = contacts.find(c => c.id === selectedId);

  const filteredContacts = useMemo(() => {
    return contacts
      .filter(c => groupFilter === 'Todas' || c.group === groupFilter)
      .filter(c => {
        const q = search.toLowerCase();
        return c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q);
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [contacts, groupFilter, search]);

  const grouped = useMemo(() => {
    const map: Record<string, Contact[]> = {};
    filteredContacts.forEach(c => {
      const letter = c.lastName[0].toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(c);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredContacts]);

  const handleAdd = () => {
    if (!formData.firstName || !formData.lastName) return;
    const newContact: Contact = {
      id: Date.now().toString(),
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      phone: formData.phone || '',
      email: formData.email || '',
      address: formData.address || '',
      notes: formData.notes || '',
      group: formData.group || 'Clientes',
    };
    setContacts(prev => [...prev, newContact]);
    setShowForm(false);
    setFormData({ firstName: '', lastName: '', phone: '', email: '', address: '', notes: '', group: 'Clientes' });
  };

  const handleEdit = () => {
    if (!editingId || !formData.firstName || !formData.lastName) return;
    setContacts(prev => prev.map(c => c.id === editingId ? { ...c, ...formData } as Contact : c));
    setEditingId(null);
    setShowForm(false);
    setFormData({ firstName: '', lastName: '', phone: '', email: '', address: '', notes: '', group: 'Clientes' });
  };

  const handleDelete = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(contacts.find(c => c.id !== id)?.id || '');
  };

  const openEdit = (contact: Contact) => {
    setFormData({ ...contact });
    setEditingId(contact.id);
    setShowForm(true);
  };

  const initials = (c: Contact) => `${c.firstName[0]}${c.lastName[0]}`.toUpperCase();

  return (
    <div className="flex h-full" style={{ background: '#0a1628' }}>
      {/* Left panel - Contact list */}
      <div className="w-80 shrink-0 flex flex-col" style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0d1b2a' }}>
        {/* Search */}
        <div className="p-3 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Search size={14} className="text-gray-500 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-sm text-white outline-none w-full placeholder-gray-600" placeholder="Buscar contactos..." />
            </div>
            <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ firstName: '', lastName: '', phone: '', email: '', address: '', notes: '', group: 'Clientes' }); }} className="p-2 rounded-lg bg-[#d4a853] text-[#0a1628] hover:brightness-110 transition-all shrink-0">
              <Plus size={16} />
            </button>
          </div>
          {/* Group filters */}
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setGroupFilter('Todas')} className={`px-2 py-0.5 rounded-full text-[10px] ${groupFilter === 'Todas' ? 'bg-[#d4a853] text-[#0a1628]' : 'text-gray-500 hover:bg-[#1a2744]'}`}>Todas</button>
            {GROUPS.map(g => (
              <button key={g} onClick={() => setGroupFilter(g)} className={`px-2 py-0.5 rounded-full text-[10px] ${groupFilter === g ? 'text-white' : 'text-gray-500 hover:bg-[#1a2744]'}`} style={groupFilter === g ? { background: `${GROUP_COLORS[g]}30`, color: GROUP_COLORS[g] } : {}}>{g}</button>
            ))}
          </div>
        </div>

        {/* Import/Export buttons */}
        <div className="flex gap-2 px-3 pb-2 shrink-0">
          <button className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] text-gray-500 hover:text-gray-300 hover:bg-[#1a2744] transition-colors border border-white/5">
            <Upload size={10} /> Importar
          </button>
          <button className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] text-gray-500 hover:text-gray-300 hover:bg-[#1a2744] transition-colors border border-white/5">
            <Download size={10} /> Exportar
          </button>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-auto px-3 pb-3">
          {grouped.map(([letter, items]) => (
            <div key={letter}>
              <div className="sticky top-0 text-[10px] font-semibold text-[#d4a853] px-2 py-1 uppercase tracking-wider" style={{ background: '#0d1b2a' }}>{letter}</div>
              <div className="space-y-0.5">
                {items.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedId(contact.id)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all ${selectedId === contact.id ? 'bg-[rgba(212,168,83,0.08)]' : 'hover:bg-[rgba(255,255,255,0.03)]'}`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${GROUP_COLORS[contact.group]}20`, color: GROUP_COLORS[contact.group] }}>
                      {initials(contact)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{contact.firstName} {contact.lastName}</p>
                      <p className="text-[10px] text-gray-500 truncate">{contact.phone}</p>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: GROUP_COLORS[contact.group] }} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Contact detail */}
      <div className="flex-1 overflow-auto p-6">
        {selectedContact ? (
          <div>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: `${GROUP_COLORS[selectedContact.group]}20`, color: GROUP_COLORS[selectedContact.group] }}>
                  {initials(selectedContact)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedContact.firstName} {selectedContact.lastName}</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mt-1" style={{ background: `${GROUP_COLORS[selectedContact.group]}15`, color: GROUP_COLORS[selectedContact.group] }}>
                    <Tag size={8} /> {selectedContact.group}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(selectedContact)} className="p-2 rounded-lg hover:bg-[#1a2744] text-gray-400 hover:text-[#d4a853] transition-colors" title="Editar">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(selectedContact.id)} className="p-2 rounded-lg hover:bg-[#1a2744] text-gray-400 hover:text-red-400 transition-colors" title="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4 max-w-lg">
              {selectedContact.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#0d1b2a' }}>
                  <Phone size={16} className="text-green-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Telefono</p>
                    <p className="text-sm text-white">{selectedContact.phone}</p>
                  </div>
                </div>
              )}
              {selectedContact.email && (
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#0d1b2a' }}>
                  <Mail size={16} className="text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Email</p>
                    <p className="text-sm text-white">{selectedContact.email}</p>
                  </div>
                </div>
              )}
              {selectedContact.address && (
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#0d1b2a' }}>
                  <MapPin size={16} className="text-red-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Direccion</p>
                    <p className="text-sm text-white">{selectedContact.address}</p>
                  </div>
                </div>
              )}
              {selectedContact.notes && (
                <div className="p-3 rounded-lg" style={{ background: '#0d1b2a' }}>
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Notas</p>
                  <p className="text-sm text-gray-300 whitespace-pre-line">{selectedContact.notes}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <User size={48} />
            <p className="mt-2 text-sm">Selecciona un contacto</p>
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-5 w-96 max-h-[90%] overflow-auto" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">{editingId ? 'Editar Contacto' : 'Nuevo Contacto'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                  <input value={formData.firstName || ''} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Apellidos</label>
                  <input value={formData.lastName || ''} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Telefono</label>
                <input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email</label>
                <input value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Direccion</label>
                <input value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Grupo</label>
                <select value={formData.group || 'Clientes'} onChange={e => setFormData({ ...formData, group: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notas</label>
                <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none resize-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', minHeight: 60 }} />
              </div>
              <button onClick={editingId ? handleEdit : handleAdd} className="w-full py-2 rounded-md bg-[#d4a853] text-[#0a1628] font-medium text-sm hover:brightness-110 transition-all">
                {editingId ? 'Guardar Cambios' : 'Crear Contacto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
