// Shared Virtual File System for Terminal and File Manager

export interface VFSNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: Map<string, VFSNode>;
  size?: number;
  createdAt: number;
  modifiedAt: number;
}

export class VirtualFileSystem {
  private root: VFSNode;
  private currentPath: string;

  constructor() {
    this.root = {
      name: '/',
      type: 'directory',
      children: new Map(),
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    this.currentPath = '/home/usuario';
    this.initDefaultStructure();
  }

  private initDefaultStructure() {
    // Create /home/usuario
    this.mkdir('/home');
    this.mkdir('/home/usuario');
    this.mkdir('/home/usuario/Documentos');
    this.mkdir('/home/usuario/Descargas');
    this.mkdir('/home/usuario/Imagenes');
    this.mkdir('/home/usuario/Musica');
    this.touch('/home/usuario/readme.txt', 'Bienvenido a PromurciaOS v2.0\nSistema operativo web para Promurcia.com\n');

    // Create /etc
    this.mkdir('/etc');
    this.touch('/etc/os-release', 'NAME=PromurciaOS\nVERSION=2.0\nID=promurcia\nHOME_URL=https://promurcia.com\n');
    this.touch('/etc/hosts', '127.0.0.1 localhost\n127.0.0.1 promurcia-os\n');

    // Create /var
    this.mkdir('/var');
    this.mkdir('/var/log');
    this.touch('/var/log/syslog', 'System initialized.\nPromurciaOS v2.0 ready.\n');

    // Create /tmp
    this.mkdir('/tmp');
  }

  getPath(): string {
    return this.currentPath;
  }

  setPath(path: string): boolean {
    const resolved = this.resolvePath(path);
    const node = this.getNode(resolved);
    if (node && node.type === 'directory') {
      this.currentPath = resolved;
      return true;
    }
    return false;
  }

  private resolvePath(path: string): string {
    if (path.startsWith('/')) return this.normalizePath(path);
    return this.normalizePath(`${this.currentPath}/${path}`);
  }

  private normalizePath(path: string): string {
    const parts = path.split('/').filter(Boolean);
    const stack: string[] = [];
    for (const part of parts) {
      if (part === '..') {
        stack.pop();
      } else if (part !== '.') {
        stack.push(part);
      }
    }
    return '/' + stack.join('/');
  }

  private getNode(path: string): VFSNode | null {
    const parts = path.split('/').filter(Boolean);
    let current: VFSNode = this.root;
    for (const part of parts) {
      if (!current.children?.has(part)) return null;
      current = current.children.get(part)!;
    }
    return current;
  }

  ls(path?: string): VFSNode[] | null {
    const targetPath = path ? this.resolvePath(path) : this.currentPath;
    const node = this.getNode(targetPath);
    if (!node || node.type !== 'directory' || !node.children) return null;
    return Array.from(node.children.values());
  }

  cd(path: string): boolean {
    return this.setPath(path);
  }

  pwd(): string {
    return this.currentPath;
  }

  mkdir(path: string): boolean {
    const resolved = this.resolvePath(path);
    const parentPath = resolved.substring(0, resolved.lastIndexOf('/')) || '/';
    const name = resolved.substring(resolved.lastIndexOf('/') + 1);
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== 'directory' || !parent.children) return false;
    if (parent.children.has(name)) return false;
    parent.children.set(name, {
      name,
      type: 'directory',
      children: new Map(),
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    });
    return true;
  }

  touch(path: string, content: string = ''): boolean {
    const resolved = this.resolvePath(path);
    const parentPath = resolved.substring(0, resolved.lastIndexOf('/')) || '/';
    const name = resolved.substring(resolved.lastIndexOf('/') + 1);
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== 'directory' || !parent.children) return false;
    parent.children.set(name, {
      name,
      type: 'file',
      content,
      size: new Blob([content]).size,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    });
    return true;
  }

  cat(path: string): string | null {
    const resolved = this.resolvePath(path);
    const node = this.getNode(resolved);
    if (!node || node.type !== 'file') return null;
    return node.content ?? '';
  }

  rm(path: string): boolean {
    const resolved = this.resolvePath(path);
    const parentPath = resolved.substring(0, resolved.lastIndexOf('/')) || '/';
    const name = resolved.substring(resolved.lastIndexOf('/') + 1);
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== 'directory' || !parent.children?.has(name)) return false;
    const node = parent.children.get(name)!;
    if (node.type === 'directory') return false;
    parent.children.delete(name);
    return true;
  }

  rmdir(path: string): boolean {
    const resolved = this.resolvePath(path);
    const parentPath = resolved.substring(0, resolved.lastIndexOf('/')) || '/';
    const name = resolved.substring(resolved.lastIndexOf('/') + 1);
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== 'directory' || !parent.children?.has(name)) return false;
    const node = parent.children.get(name)!;
    if (node.type !== 'directory') return false;
    if (node.children && node.children.size > 0) return false;
    parent.children.delete(name);
    return true;
  }

  exists(path: string): boolean {
    return this.getNode(this.resolvePath(path)) !== null;
  }

  stat(path: string): VFSNode | null {
    return this.getNode(this.resolvePath(path));
  }

  write(path: string, content: string): boolean {
    const resolved = this.resolvePath(path);
    const node = this.getNode(resolved);
    if (!node || node.type !== 'file') return false;
    node.content = content;
    node.size = new Blob([content]).size;
    node.modifiedAt = Date.now();
    return true;
  }

  rename(oldPath: string, newPath: string): boolean {
    const resolvedOld = this.resolvePath(oldPath);
    const resolvedNew = this.resolvePath(newPath);
    const parentOld = this.getNode(resolvedOld.substring(0, resolvedOld.lastIndexOf('/')) || '/');
    if (!parentOld || !parentOld.children) return false;
    const node = parentOld.children.get(resolvedOld.substring(resolvedOld.lastIndexOf('/') + 1));
    if (!node) return false;
    const parentNew = this.getNode(resolvedNew.substring(0, resolvedNew.lastIndexOf('/')) || '/');
    if (!parentNew || !parentNew.children) return false;
    const newName = resolvedNew.substring(resolvedNew.lastIndexOf('/') + 1);
    parentNew.children.set(newName, { ...node, name: newName });
    parentOld.children.delete(resolvedOld.substring(resolvedOld.lastIndexOf('/') + 1));
    return true;
  }
}

export const createVirtualFS = () => new VirtualFileSystem();
