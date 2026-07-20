import { useState, useCallback, useMemo } from 'react';
import {
  Folder, FileText, Image, Music, File, ChevronRight, ChevronLeft,
  ArrowUp, Grid, List, Plus, Trash2, Edit3, Copy, Scissors,
  ClipboardPaste, Search, X, FolderOpen
} from 'lucide-react';
import { VirtualFileSystem } from '../terminal/virtualFS';

type ViewMode = 'grid' | 'list';
type FileItem = ReturnType<VirtualFileSystem['ls']> extends (infer T)[] | null ? T : never;

export default function FileManager() {
  const [vfs] = useState(() => new VirtualFileSystem());
  const [path, setPath] = useState('/home/usuario');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<{ items: string[]; cut: boolean } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem | null } | null>(null);
  const [renameModal, setRenameModal] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileModal, setNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const items = useMemo(() => {
    const result = vfs.ls(path);
    return result ?? [];
  }, [vfs, path]);

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (searchQuery) {
      filtered = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, searchQuery]);

  const navigateTo = useCallback((targetPath: string) => {
    if (vfs.cd(targetPath)) {
      setPath(vfs.getPath());
      setSelectedItems(new Set());
    }
  }, [vfs]);

  const navigateUp = useCallback(() => {
    const parent = path.substring(0, path.lastIndexOf('/')) || '/';
    navigateTo(parent);
  }, [navigateTo, path]);

  const breadcrumbs = useMemo(() => {
    const parts = path.split('/').filter(Boolean);
    const result: { name: string; path: string }[] = [{ name: 'Raiz', path: '/' }];
    let currentPath = '';
    for (const part of parts) {
      currentPath += '/' + part;
      result.push({ name: part, path: currentPath });
    }
    return result;
  }, [path]);

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'directory') return <Folder size={viewMode === 'grid' ? 48 : 20} color="#d4a853" />;
    if (item.name.endsWith('.txt') || item.name.endsWith('.md')) return <FileText size={viewMode === 'grid' ? 48 : 20} color="#3b82f6" />;
    if (item.name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return <Image size={viewMode === 'grid' ? 48 : 20} color="#22c55e" />;
    if (item.name.match(/\.(mp3|wav|ogg|flac)$/)) return <Music size={viewMode === 'grid' ? 48 : 20} color="#8b5cf6" />;
    return <File size={viewMode === 'grid' ? 48 : 20} color="#6b7280" />;
  };

  const getFileType = (item: FileItem) => {
    if (item.type === 'directory') return 'Carpeta';
    const ext = item.name.split('.').pop()?.toLowerCase() ?? '';
    const typeMap: Record<string, string> = { txt: 'Texto', md: 'Markdown', jpg: 'Imagen', jpeg: 'Imagen', png: 'Imagen', pdf: 'PDF', mp3: 'Audio' };
    return typeMap[ext] ?? 'Archivo';
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('es-ES');
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      vfs.mkdir(`${path}/${newFolderName.trim()}`);
      setNewFolderModal(false);
      setNewFolderName('');
      setPath(path + ''); // trigger re-render
    }
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      vfs.touch(`${path}/${newFileName.trim()}`);
      setNewFileModal(false);
      setNewFileName('');
      setPath(path + '');
    }
  };

  const handleRename = () => {
    if (renameValue.trim() && renameModal) {
      vfs.rename(`${path}/${renameModal}`, `${path}/${renameValue.trim()}`);
      setRenameModal(null);
      setRenameValue('');
      setPath(path + '');
    }
  };

  const handleDelete = (name: string) => {
    const item = items.find(i => i.name === name);
    if (!item) return;
    const itemType = item.type === 'directory' ? 'carpeta' : 'archivo';
    if (window.confirm(`¿Eliminar ${itemType} "${name}"?`)) {
      if (item.type === 'directory') {
        vfs.rmdir(`${path}/${name}`);
      } else {
        vfs.rm(`${path}/${name}`);
      }
      setPath(path + '');
    }
  };

  const handleCopy = () => {
    setClipboard({ items: Array.from(selectedItems), cut: false });
  };

  const handleCut = () => {
    setClipboard({ items: Array.from(selectedItems), cut: true });
  };

  const handlePaste = () => {
    if (!clipboard) return;
    // Simplified paste - just show it would work
    setClipboard(null);
  };

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'directory') {
      navigateTo(`${path}/${item.name}`);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const folderCount = items.filter(i => i.type === 'directory').length;
  const fileCount = items.filter(i => i.type === 'file').length;

  return (
    <div className="flex flex-col h-full w-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#111d32' }}>
        <button onClick={navigateUp} className="p-1.5 rounded hover:bg-white/5" title="Subir"><ArrowUp size={16} color="#9ca3af" /></button>
        <div className="flex items-center gap-1 flex-1 min-w-0 px-2 py-1 rounded" style={{ background: '#1a2744' }}>
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} color="#6b7280" />}
              <button
                onClick={() => navigateTo(crumb.path)}
                className="text-xs hover:text-[#d4a853] transition-colors truncate"
                style={{ color: i === breadcrumbs.length - 1 ? '#d4a853' : '#9ca3af' }}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search size={14} color="#6b7280" className="absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="pl-7 pr-7 py-1 text-xs rounded outline-none w-40"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X size={12} color="#6b7280" />
              </button>
            )}
          </div>
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white/10' : 'hover:bg-white/5'}`}><Grid size={16} color={viewMode === 'grid' ? '#d4a853' : '#9ca3af'} /></button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white/10' : 'hover:bg-white/5'}`}><List size={16} color={viewMode === 'list' ? '#d4a853' : '#9ca3af'} /></button>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)', background: '#0f1a2b' }}>
        <button onClick={() => setNewFolderModal(true)} className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-white/5" style={{ color: '#9ca3af' }}>
          <Plus size={14} /> Nueva carpeta
        </button>
        <button onClick={() => setNewFileModal(true)} className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-white/5" style={{ color: '#9ca3af' }}>
          <FileText size={14} /> Nuevo archivo
        </button>
        {selectedItems.size > 0 && (
          <>
            <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-white/5" style={{ color: '#9ca3af' }}>
              <Copy size={14} /> Copiar
            </button>
            <button onClick={handleCut} className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-white/5" style={{ color: '#9ca3af' }}>
              <Scissors size={14} /> Cortar
            </button>
            <button onClick={() => { selectedItems.forEach(name => handleDelete(name)); setSelectedItems(new Set()); }} className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-red-500/20" style={{ color: '#ef4444' }}>
              <Trash2 size={14} /> Eliminar
            </button>
          </>
        )}
        {clipboard && (
          <button onClick={handlePaste} className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-white/5" style={{ color: '#d4a853' }}>
            <ClipboardPaste size={14} /> Pegar
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3">
            {filteredItems.map(item => (
              <div
                key={item.name}
                onClick={() => {
                  if (selectedItems.has(item.name)) {
                    const next = new Set(selectedItems);
                    next.delete(item.name);
                    setSelectedItems(next);
                  } else {
                    setSelectedItems(new Set([item.name]));
                  }
                }}
                onDoubleClick={() => handleItemClick(item)}
                onContextMenu={e => handleContextMenu(e, item)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg cursor-pointer transition-all"
                style={{
                  background: selectedItems.has(item.name) ? 'rgba(212,168,83,0.1)' : 'transparent',
                  border: selectedItems.has(item.name) ? '1px solid rgba(212,168,83,0.3)' : '1px solid transparent',
                }}
              >
                {getFileIcon(item)}
                <span className="text-xs text-center truncate w-full" style={{ color: '#d1d5db' }}>{item.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: '#6b7280' }}>Nombre</th>
                <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: '#6b7280' }}>Tamano</th>
                <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: '#6b7280' }}>Fecha</th>
                <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: '#6b7280' }}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr
                  key={item.name}
                  onClick={() => setSelectedItems(new Set([item.name]))}
                  onDoubleClick={() => handleItemClick(item)}
                  onContextMenu={e => handleContextMenu(e, item)}
                  className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                  style={{ background: selectedItems.has(item.name) ? 'rgba(212,168,83,0.05)' : 'transparent', borderLeft: selectedItems.has(item.name) ? '2px solid #d4a853' : '2px solid transparent' }}
                >
                  <td className="py-2 px-3 flex items-center gap-2">
                    {getFileIcon(item)}
                    <span style={{ color: '#d1d5db' }}>{item.name}</span>
                  </td>
                  <td className="py-2 px-3" style={{ color: '#6b7280' }}>{formatSize(item.size)}</td>
                  <td className="py-2 px-3" style={{ color: '#6b7280' }}>{formatDate(item.modifiedAt ?? item.createdAt)}</td>
                  <td className="py-2 px-3" style={{ color: '#6b7280' }}>{getFileType(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#111d32', color: '#6b7280' }}>
        <span>{items.length} elementos | {folderCount} carpetas, {fileCount} archivos</span>
        <span>{filteredItems.length} mostrados</span>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 rounded-lg py-1"
            style={{
              top: contextMenu.y,
              left: contextMenu.x,
              background: '#111d32',
              border: '1px solid rgba(255,255,255,0.08)',
              minWidth: 160,
            }}
          >
            {contextMenu.item?.type === 'directory' && (
              <button onClick={() => { navigateTo(`${path}/${contextMenu.item!.name}`); setContextMenu(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/5" style={{ color: '#d1d5db' }}>
                <FolderOpen size={14} /> Abrir
              </button>
            )}
            <button onClick={() => { setRenameModal(contextMenu.item!.name); setRenameValue(contextMenu.item!.name); setContextMenu(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/5" style={{ color: '#d1d5db' }}>
              <Edit3 size={14} /> Renombrar
            </button>
            <button onClick={() => { handleCopy(); setContextMenu(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/5" style={{ color: '#d1d5db' }}>
              <Copy size={14} /> Copiar
            </button>
            <button onClick={() => { handleDelete(contextMenu.item!.name); setContextMenu(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-red-500/20" style={{ color: '#ef4444' }}>
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </>
      )}

      {/* New Folder Modal */}
      {newFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-xl p-6 w-80" style={{ background: '#111d32', border: '1px solid rgba(212,168,83,0.15)' }}>
            <h3 className="text-sm font-semibold mb-4">Nueva Carpeta</h3>
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              placeholder="Nombre de la carpeta"
              className="w-full px-3 py-2 rounded text-sm outline-none mb-4"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setNewFolderModal(false); setNewFolderName(''); }} className="px-3 py-1.5 text-xs rounded hover:bg-white/5" style={{ color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleCreateFolder} className="px-3 py-1.5 text-xs rounded font-medium" style={{ background: '#d4a853', color: '#0a1628' }}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* New File Modal */}
      {newFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-xl p-6 w-80" style={{ background: '#111d32', border: '1px solid rgba(212,168,83,0.15)' }}>
            <h3 className="text-sm font-semibold mb-4">Nuevo Archivo</h3>
            <input
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFile()}
              placeholder="Nombre del archivo"
              className="w-full px-3 py-2 rounded text-sm outline-none mb-4"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setNewFileModal(false); setNewFileName(''); }} className="px-3 py-1.5 text-xs rounded hover:bg-white/5" style={{ color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleCreateFile} className="px-3 py-1.5 text-xs rounded font-medium" style={{ background: '#d4a853', color: '#0a1628' }}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-xl p-6 w-80" style={{ background: '#111d32', border: '1px solid rgba(212,168,83,0.15)' }}>
            <h3 className="text-sm font-semibold mb-4">Renombrar</h3>
            <input
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              className="w-full px-3 py-2 rounded text-sm outline-none mb-4"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setRenameModal(null); setRenameValue(''); }} className="px-3 py-1.5 text-xs rounded hover:bg-white/5" style={{ color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleRename} className="px-3 py-1.5 text-xs rounded font-medium" style={{ background: '#d4a853', color: '#0a1628' }}>Renombrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
