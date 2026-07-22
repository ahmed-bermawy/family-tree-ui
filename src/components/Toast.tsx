import { useEffect, useState } from 'react';

interface Props {
  message: string;
  type?: 'error' | 'success' | 'info';
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'error', duration = 3000, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    error: 'bg-red-600/90 border-red-500 text-red-100',
    success: 'bg-emerald-600/90 border-emerald-500 text-emerald-100',
    info: 'bg-blue-600/90 border-blue-500 text-blue-100',
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <div
        className={`px-5 py-3 rounded-xl border shadow-2xl text-sm font-medium backdrop-blur-sm transition-all duration-300 ${
          colors[type]
        } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
      >
        {message}
      </div>
    </div>
  );
}
