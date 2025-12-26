
import React, { useState, useEffect } from 'react';
import { isLowEndDevice } from '../services/offline';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [liteMode, setLiteMode] = useState(isLowEndDevice());

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center py-8 px-4 md:py-16 transition-colors duration-400 ${liteMode ? 'lite-mode' : ''}`}>
      <div className="fixed top-0 left-0 w-full z-[10000] no-print">
        {!isOnline && (
          <div className="bg-rose-600 text-white text-[9px] font-black uppercase tracking-[0.3em] py-2 text-center animate-pulse">
            Neural Core Offline - Data akan disinkronisasi saat online
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl space-y-10 relative">
        {children}
        
        <footer className="text-center py-12 space-y-3">
          <div className="flex justify-center gap-4 mb-4">
             <button 
               onClick={() => setLiteMode(!liteMode)}
               className={`text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${liteMode ? 'bg-emerald-600 text-white' : 'text-slate-400 border-slate-200'}`}
             >
               {liteMode ? 'LITE MODE ACTIVE' : 'PREMIUM UI'}
             </button>
          </div>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-emerald-200 dark:via-emerald-700 to-transparent mx-auto mb-6"></div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-emerald-800/60 dark:text-emerald-400/60 uppercase">
            🌿 DREAM TEAM – THE POWER SOUL OF SHALAWAT
          </p>
          <p className="arabic text-lg text-emerald-900/80 dark:text-emerald-200 font-bold">
            رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي
          </p>
          <p className="text-[9px] text-slate-400 dark:text-slate-600 font-medium tracking-widest uppercase">
            © 2025 SIF AL FIKRI • INDONESIA 🇮🇩 PALESTINE 🇵🇸
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
