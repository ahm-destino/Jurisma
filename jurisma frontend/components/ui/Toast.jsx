import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const Toast = ({ toast, onClose }) => {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // If we wanted to animate out right before remove, we could setTimeout here
    // based on duration - 300ms, but for simplicity we rely on the parent removal
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 200); // Wait for exit animation
  };

  const icons = {
    success: <CheckCircle className="text-emerald-500 shrink-0" size={20} />,
    error: <AlertCircle className="text-red-500 shrink-0" size={20} />,
    info: <Info className="text-jurisma-500 shrink-0" size={20} />,
    warning: <AlertTriangle className="text-amber-500 shrink-0" size={20} />,
  };

  const bgStyles = {
    success: 'bg-emerald-50 border-emerald-100',
    error: 'bg-red-50 border-red-100',
    info: 'bg-jurisma-50 border-jurisma-100',
    warning: 'bg-amber-50 border-amber-100',
  };

  const type = toast.type || 'info';

  return (
    <div 
      className={`
        flex items-start gap-3 p-4 rounded-xl shadow-lg border pointer-events-auto
        max-w-sm w-full bg-white dark:bg-jurisma-900 transition-all duration-300
        ${isLeaving ? 'opacity-0 translate-x-8' : 'animate-in slide-in-from-right-8 fade-in'}
      `}
    >
      <div className={`p-2 rounded-full ${bgStyles[type]}`}>
        {icons[type]}
      </div>
      
      <div className="flex-1 min-w-0 pt-0.5">
        {toast.title && <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{toast.title}</h4>}
        <p className="text-sm text-slate-600 dark:text-jurisma-300 break-words">{toast.message}</p>
      </div>

      <button 
        onClick={handleClose}
        className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-jurisma-800 transition-colors shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
};
