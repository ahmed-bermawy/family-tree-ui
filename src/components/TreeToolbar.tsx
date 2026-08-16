import { useEffect, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

export default function TreeToolbar({ wrapperRef }: Props) {
  const { zoomIn, zoomOut, fitView, setCenter, setViewport } = useReactFlow();
  const { t } = useI18n();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    const el = wrapperRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // fullscreen not supported — ignore
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const btnClass =
    'px-3 py-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm font-medium transition first:rounded-l-lg last:rounded-r-lg cursor-pointer';

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-px shadow-lg rounded-lg bg-gray-800/80 backdrop-blur-sm border border-gray-700"
      role="toolbar"
      aria-label="Tree view controls"
    >
      <button className={btnClass} onClick={() => zoomIn()} title={t.zoomIn} aria-label={t.zoomIn}>
        ➕
      </button>
      <button className={btnClass} onClick={() => zoomOut()} title={t.zoomOut} aria-label={t.zoomOut}>
        ➖
      </button>
      <button
        className={btnClass}
        onClick={() => fitView({ padding: 0.15, duration: 300 })}
        title={t.fitScreen}
        aria-label={t.fitScreen}
      >
        ⤢ {t.fitScreen}
      </button>
      <button
        className={btnClass}
        onClick={() => setCenter(0, 0, { zoom: 1, duration: 300 })}
        title={t.centerTree}
        aria-label={t.centerTree}
      >
        🎯 {t.centerTree}
      </button>
      <button
        className={btnClass}
        onClick={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 })}
        title={t.resetView}
        aria-label={t.resetView}
      >
        🔄 {t.resetView}
      </button>
      <button
        className={btnClass}
        onClick={toggleFullscreen}
        title={isFullscreen ? t.exitFullscreen : t.fullScreen}
        aria-label={isFullscreen ? t.exitFullscreen : t.fullScreen}
      >
        {isFullscreen ? '🗗' : '⛶'} {isFullscreen ? t.exitFullscreen : t.fullScreen}
      </button>
    </div>
  );
}
