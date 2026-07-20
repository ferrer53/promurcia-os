import { AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/stores/osStore';
import { AppWindow } from './AppWindow';

export function WindowManager() {
  const windows = useOSStore((s) => s.windows);

  // Sort by zIndex so higher windows render after lower ones
  const sortedWindows = [...windows]
    .filter((w) => !w.minimized)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="absolute inset-0" style={{ zIndex: 100 }}>
      <AnimatePresence>
        {sortedWindows.map((w) => (
          <AppWindow key={w.id} window={w} />
        ))}
      </AnimatePresence>
    </div>
  );
}
