
import React, { useEffect } from 'react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-xs px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            px-4 py-3 rounded-2xl shadow-xl text-sm font-medium flex items-center justify-between animate-bounce-in
            ${t.type === 'success' ? 'bg-emerald-600 text-white' : ''}
            ${t.type === 'error' ? 'bg-rose-600 text-white' : ''}
            ${t.type === 'info' ? 'bg-blue-600 text-white' : ''}
          `}
        >
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-4 opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
