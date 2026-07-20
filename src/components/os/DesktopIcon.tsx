import { useCallback, useRef, useState, useEffect } from 'react';
import { useOSStore } from '@/stores/osStore';
import type { DesktopIconItem } from '@/stores/osStore';
import { getAppById } from '@/stores/appRegistry';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface DesktopIconProps {
  icon: DesktopIconItem;
}

export function DesktopIcon({ icon }: DesktopIconProps) {
  const openWindow = useOSStore((s) => s.openWindow);

  const app = getAppById(icon.appId);
  const IconComp = app ? (Icons[app.icon as keyof typeof Icons] as LucideIcon) : null;
  const catColor = app ? '#d4a853' : '#6b7280';

  const [pos, setPos] = useState({ x: icon.x, y: icon.y });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, iconX: 0, iconY: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        iconX: pos.x,
        iconY: pos.y,
      };
    },
    [pos]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPos({
        x: Math.max(0, dragStartRef.current.iconX + dx),
        y: Math.max(0, dragStartRef.current.iconY + dy),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDoubleClick = useCallback(() => {
    if (app && !isDragging) {
      openWindow(icon.appId, app.name, app.defaultWidth, app.defaultHeight);
    }
  }, [app, icon.appId, isDragging, openWindow]);

  return (
    <div
      className="absolute flex flex-col items-center gap-1 cursor-pointer select-none group"
      style={{
        left: pos.x,
        top: pos.y,
        width: 72,
        opacity: isDragging ? 0.8 : 1,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="flex items-center justify-center rounded-xl transition-all duration-150 group-hover:scale-105"
        style={{
          width: 52,
          height: 52,
          background: `${catColor}20`,
          border: '1px solid rgba(212,168,83,0.1)',
        }}
      >
        {IconComp && <IconComp size={26} color={catColor} />}
      </div>
      <span
        className="text-[11px] font-medium text-center leading-tight px-1 line-clamp-2"
        style={{
          color: '#fff',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          maxWidth: 72,
        }}
      >
        {icon.label}
      </span>
    </div>
  );
}
