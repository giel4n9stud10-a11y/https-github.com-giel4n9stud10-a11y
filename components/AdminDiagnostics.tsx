
import React, { useState, useEffect, useRef } from 'react';
import { ICONS } from '../constants';
import { getIsActuallyOnline, setMockOffline, OFFLINE_STORAGE_KEYS, getFromCache, saveToCache } from '../services/offline';

interface AdminDiagnosticsProps {
  bookings: any[];
  k3: any[];
  inventory: any[];
  onImport: (data: any) => void;
}

export const AdminDiagnostics: React.FC<AdminDiagnosticsProps> = ({ bookings, k3, inventory, onImport }) => {
  const [isMocked, setIsMocked] = useState(localStorage.getItem(OFFLINE_STORAGE_KEYS.MOCK_OFFLINE) === 'true');
  const [healthStatus, setHealthStatus] = useState({
    supabase: 'Checking...',
    gemini: 'Checking...',
    storage: 'Checking...'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runCheck = async () => {
    setHealthStatus({
      supabase: getIsActuallyOnline() ? 'ACTIVE' : 'OFFLINE MODE',
      gemini: 'READY',
      storage: `${(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB USED`
    });
  };

  useEffect(() => {
    runCheck();
  }, [isMocked]);

  const toggleMock = () => {
    const newState = !isMocked;
    setMockOffline(newState);
    setIsMocked(newState);
  };

  const exportSystemBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: "7.5-PLATINUM",
      data: { bookings, k3, inventory }
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DreamOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.data || !json.version) throw new Error("Format file tidak valid.");
        if (confirm("Import data akan menimpa data saat ini. Lanjutkan?")) {
          onImport(json.data);
        }
      } catch (err) {
        alert("Gagal mengimpor data: File rusak atau format salah.");
      }
    };
    reader.readAsText(file);
  };

  const purgeSystem = () => {
    if(!confirm("Hapus semua cache lokal? Sinkronisasi yang tertunda akan hilang.")) return;
    localStorage.clear();
    sessionStorage.clear();
    alert("System Purge Complete. Reloading...");
    window.location.reload();
  };

  const syncQueue = getFromCache(OFFLINE_STORAGE_KEYS.SYNC_QUEUE) || [];

  return (
    <div className="space-y-8 animate-fade-in no-print">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-[2.5rem] border border-emerald-500/10 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Sync Status</p>
          <p className={`text-xl font-black ${healthStatus.supabase === 'ACTIVE' ? 'text-emerald-500' : 'text-rose-500'}`}>{healthStatus.supabase}</p>
        </div>
        <div className="glass p-8 rounded-[2.5rem] border border-emerald-500/10 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Neural Link</p>
          <p className="text-xl font-black text-emerald-500">{healthStatus.gemini}</p>
        </div>
        <div className="glass p-8 rounded-[2.5rem] border border-emerald-500/10 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Memory</p>
          <p className="text-xl font-black text-emerald-500">{healthStatus.storage}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-10 rounded-[3.5rem] border border-emerald-500/20 shadow-2xl overflow-hidden bg-emerald-600 text-white relative">
          <div className="relative z-10">
            <h4 className="text-2xl font-black uppercase tracking-tighter">Neural Portability</h4>
            <p className="text-sm font-bold opacity-80 mt-1 mb-8">Pindahkan seluruh data antar instansi atau cadangkan ke cloud eksternal.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={exportSystemBackup} className="py-5 rounded-2xl font-black text-[9px] uppercase tracking-widest bg-white text-emerald-600 hover:scale-[1.02] transition-all">
                EXPORT JSON
              </button>
              <button onClick={handleImportClick} className="py-5 rounded-2xl font-black text-[9px] uppercase tracking-widest bg-emerald-900/30 text-white border border-white/20 hover:scale-[1.02] transition-all">
                IMPORT JSON
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
          </div>
        </div>
        <div className="glass p-10 rounded-[3.5rem] border border-rose-500/20 shadow-2xl overflow-hidden">
          <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">System Purge</h4>
          <p className="text-sm font-bold text-slate-400 mt-1 mb-8">Reset total semua cache dan antrean sinkronisasi lokal.</p>
          <button onClick={purgeSystem} className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest bg-rose-600 text-white transition-all active:scale-95">
            INITIATE PURGE
          </button>
        </div>
      </div>

      <div className="glass p-10 rounded-[3.5rem] border border-emerald-500/10">
        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
          <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
          Pending Sync Queue ({syncQueue.length})
        </h4>
        <div className="space-y-4">
          {syncQueue.length === 0 ? (
            <div className="text-center py-10 opacity-30 text-[10px] font-black uppercase tracking-widest">System Synced</div>
          ) : (
            syncQueue.map((task: any) => (
              <div key={task.id} className="p-5 bg-white dark:bg-emerald-950/20 rounded-2xl border border-slate-100 dark:border-emerald-500/5 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">{task.table} • {task.action}</p>
                  <p className="text-xs font-bold text-slate-500 truncate max-w-xs">{JSON.stringify(task.payload)}</p>
                </div>
                <p className="text-[9px] font-bold text-slate-400">{new Date(task.timestamp).toLocaleTimeString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
