
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import Layout from './components/Layout';
import Toast from './components/Toast';
import AiAssistant from './components/AiAssistant';
import { AdminInventory } from './components/AdminInventory';
import { AdminK3 } from './components/AdminK3';
import { AdminDiagnostics } from './components/AdminDiagnostics';
import { View, ToastMessage, Booking, K3Report, InventoryItem, TenantConfig } from './types';
import { 
  CONFIG, ICONS, DIVISI_OPTIONS, SARANA_OPTIONS, K3_CATEGORIES 
} from './constants';
import { analyzeK3Report, generateWelcomeMessage, generateNeuralForecast } from './services/gemini';
import { saveToCache, getFromCache, OFFLINE_STORAGE_KEYS, addToSyncQueue, compressImage, getIsActuallyOnline, clearSyncQueue } from './services/offline';

const supabase = createClient(CONFIG.SB_URL, CONFIG.SB_KEY);

const StatusBadge: React.FC<{ type: 'booking' | 'k3' | 'inventory'; count: number; label: string; onClick?: () => void }> = ({ type, count, label, onClick }) => {
  const styles = {
    booking: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]',
    k3: 'text-rose-600 bg-rose-500/10 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]',
    inventory: 'text-amber-600 bg-amber-500/10 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]',
  };
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 rounded-[2.5rem] border ${styles[type]} transition-all hover:scale-105 active:scale-95 group glass no-print overflow-hidden relative w-full`}
    >
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <span className="text-3xl font-black mb-1.5 group-hover:scale-110 transition-transform relative z-10">{count}</span>
      <span className="text-[8px] font-black uppercase tracking-[0.25em] opacity-60 relative z-10">{label}</span>
    </button>
  );
};

const SectionHeader: React.FC<{ 
  title: string; 
  subtitle: string; 
  icon: React.ReactNode; 
  onBack: () => void 
}> = ({ title, subtitle, icon, onBack }) => (
  <div className="flex items-center justify-between mb-12">
    <div className="flex items-center gap-6">
      <div className="p-5 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-3xl text-emerald-600 dark:text-emerald-400">
        {icon}
      </div>
      <div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{title}</h2>
        <p className="text-xs font-bold text-slate-400 dark:text-emerald-700/60 uppercase tracking-widest mt-1">{subtitle}</p>
      </div>
    </div>
    <button 
      onClick={onBack}
      className="p-4 rounded-2xl bg-slate-50 dark:bg-emerald-950/20 text-slate-400 hover:text-rose-500 transition-all active:scale-90 no-print"
    >
      <ICONS.ArrowLeft className="w-6 h-6" />
    </button>
  </div>
);

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [currentView, setCurrentView] = useState<View>(() => {
    return localStorage.getItem('tenant_profile') ? 'home' : 'setup';
  });
  const [adminTab, setAdminTab] = useState<'overview' | 'k3' | 'bookings' | 'inventory' | 'diagnostics'>('overview');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [welcomeMsg, setWelcomeMsg] = useState('Dream OS Neural Active');
  const [adminAuth, setAdminAuth] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [neuralForecast, setNeuralForecast] = useState<any>(null);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [hijriDate, setHijriDate] = useState('');
  
  const [tenant, setTenant] = useState<TenantConfig>(() => {
    const saved = localStorage.getItem('tenant_profile');
    return saved ? JSON.parse(saved) : {
      id: 'pending-setup',
      name: 'Instansi Baru',
      slogan: 'Advanced Management System',
      facilities: SARANA_OPTIONS,
      departments: DIVISI_OPTIONS
    };
  });

  const [bookings, setBookings] = useState<Booking[]>(() => getFromCache(OFFLINE_STORAGE_KEYS.BOOKINGS) || []);
  const [k3Reports, setK3Reports] = useState<K3Report[]>(() => getFromCache(OFFLINE_STORAGE_KEYS.K3) || []);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => getFromCache(OFFLINE_STORAGE_KEYS.INVENTORY) || []);
  const [k3ImagePreview, setK3ImagePreview] = useState<string | null>(null);
  const [selectedK3Category, setSelectedK3Category] = useState<string>('Maintenance');
  const [userBookingIds, setUserBookingIds] = useState<string[]>(() => JSON.parse(localStorage.getItem('user_booking_ids') || '[]'));

  const [bookingFormData, setBookingFormData] = useState({
    nama: '', whatsapp: '', divisi: '', sarana: '', tanggal: new Date().toISOString().split('T')[0], mulai: '07:30', selesai: '09:00', keperluan: ''
  });

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    if (tenant.id === 'pending-setup') return;
    try {
      const [{ data: k3 }, { data: bks }, { data: inv }] = await Promise.all([
        supabase.from('k3_reports').select('*').order('createdAt', { ascending: false }),
        supabase.from('bookings').select('*').order('createdAt', { ascending: false }),
        supabase.from('inventory').select('*').order('nama', { ascending: true }),
      ]);
      
      if (k3) { setK3Reports(k3); saveToCache(OFFLINE_STORAGE_KEYS.K3, k3); }
      if (bks) { setBookings(bks); saveToCache(OFFLINE_STORAGE_KEYS.BOOKINGS, bks); }
      if (inv) { setInventoryItems(inv); saveToCache(OFFLINE_STORAGE_KEYS.INVENTORY, inv); }
    } catch (e: any) { 
      console.warn("Using Cache Layer"); 
    }
  }, [tenant.id]);

  const processSyncQueue = useCallback(async () => {
    if (!getIsActuallyOnline()) return;
    const queue = getFromCache(OFFLINE_STORAGE_KEYS.SYNC_QUEUE) || [];
    if (queue.length === 0) return;

    addToast(`Menyelaraskan ${queue.length} perubahan...`, 'info');
    
    for (const task of queue) {
      try {
        if (task.action === 'INSERT') {
          await supabase.from(task.table).insert([task.payload]);
        } else if (task.action === 'UPDATE') {
          await supabase.from(task.table).update(task.payload).eq('id', task.payload.id);
        } else if (task.action === 'DELETE') {
          await supabase.from(task.table).delete().eq('id', task.payload.id);
        }
      } catch (err) {
        console.error("Sync error:", err);
      }
    }
    
    clearSyncQueue();
    setSyncQueueCount(0);
    addToast("Neural Core Berhasil Disinkronisasi", "success");
    fetchData();
  }, [fetchData, addToast]);

  useEffect(() => {
    const today = new Intl.DateTimeFormat('id-TN-u-ca-islamic-uma', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    setHijriDate(today);
    generateWelcomeMessage().then(setWelcomeMsg);
    fetchData();

    window.addEventListener('online', processSyncQueue);
    const interval = setInterval(() => {
      const queue = getFromCache(OFFLINE_STORAGE_KEYS.SYNC_QUEUE) || [];
      setSyncQueueCount(queue.length);
    }, 5000);

    return () => {
      window.removeEventListener('online', processSyncQueue);
      clearInterval(interval);
    };
  }, [fetchData, processSyncQueue]);

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSetupSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTenant: TenantConfig = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.get('name') as string,
      slogan: formData.get('slogan') as string,
      facilities: (formData.get('facilities') as string).split(',').map(s => s.trim()),
      departments: (formData.get('departments') as string).split(',').map(s => s.trim()),
    };
    setTenant(newTenant);
    localStorage.setItem('tenant_profile', JSON.stringify(newTenant));
    addToast("Neural Profile Berhasil Diinisialisasi", "success");
    setCurrentView('home');
  };

  const handleK3Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isAiProcessing) return;
    setIsAiProcessing(true);
    try {
      const formData = new FormData(e.currentTarget);
      let photoData = k3ImagePreview;
      if (photoData) photoData = await compressImage(photoData);

      const newReport: any = { 
        id: Math.random().toString(36).substr(2, 9), 
        tenant_id: tenant.id, 
        pelapor: formData.get('pelapor'), 
        divisi: formData.get('divisi'), 
        lokasi: formData.get('lokasi'), 
        masalah: formData.get('masalah'), 
        prioritas: 'Sedang', 
        kategori: selectedK3Category, 
        foto: photoData, 
        status: 'Belum Selesai', 
        createdAt: new Date().toISOString() 
      };
      
      if (!getIsActuallyOnline()) {
        addToSyncQueue('k3_reports', 'INSERT', newReport);
        addToast('Laporan tersimpan secara offline', 'info');
      } else {
        const aiResult = await analyzeK3Report(newReport.masalah, photoData || undefined);
        if (aiResult) { 
          newReport.prioritas = aiResult.priority; 
          newReport.suggestion = aiResult.suggestion; 
        }
        await supabase.from('k3_reports').insert([newReport]);
        addToast('Laporan K3 Berhasil Dikirim', 'success');
        fetchData();
      }
      setCurrentView('home');
      setK3ImagePreview(null);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally { setIsAiProcessing(false); }
  };

  const handleK3StatusUpdate = async (id: string, status: K3Report['status']) => {
    try {
      if (!getIsActuallyOnline()) {
        addToSyncQueue('k3_reports', 'UPDATE', { id, status });
        addToast('Perubahan status masuk antrean offline', 'info');
      } else {
        await supabase.from('k3_reports').update({ status }).eq('id', id);
        addToast(`Status laporan diperbarui ke ${status}`, 'success');
        fetchData();
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleInventorySubmit = async (data: any, id?: string) => {
    try {
      const itemData = { 
        ...data, 
        tenant_id: tenant.id, 
        stokSekarang: parseInt(data.stokSekarang), 
        lastUpdated: new Date().toISOString() 
      };
      
      if (!getIsActuallyOnline()) {
        addToSyncQueue('inventory', id ? 'UPDATE' : 'INSERT', { ...itemData, id: id || `inv-${Date.now()}` });
        addToast('Update aset disimpan secara offline', 'info');
      } else {
        if (id) {
          await supabase.from('inventory').update(itemData).eq('id', id);
        } else {
          await supabase.from('inventory').insert([{ ...itemData, id: `inv-${Date.now()}` }]);
        }
        addToast('Data aset berhasil diperbarui', 'success');
        fetchData();
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleInventoryDelete = async (id: string) => {
    if (!confirm("Hapus aset ini secara permanen dari sistem?")) return;
    try {
      if (!getIsActuallyOnline()) {
        addToSyncQueue('inventory', 'DELETE', { id });
        addToast('Penghapusan aset masuk antrean', 'info');
      } else {
        await supabase.from('inventory').delete().eq('id', id);
        addToast('Aset berhasil dihapus', 'success');
        fetchData();
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isAiProcessing) return;
    setIsAiProcessing(true);
    try {
      const newBooking = { ...bookingFormData, id: `bk-${Date.now()}`, tenant_id: tenant.id, createdAt: new Date().toISOString() };
      if (!getIsActuallyOnline()) {
        addToSyncQueue('bookings', 'INSERT', newBooking);
        addToast("Reservasi disimpan secara offline", "info");
      } else {
        const { data, error } = await supabase.from('bookings').insert([newBooking]).select();
        if (error) throw error;
        const updatedIds = [...userBookingIds, data[0].id];
        setUserBookingIds(updatedIds);
        localStorage.setItem('user_booking_ids', JSON.stringify(updatedIds));
        addToast('Reservasi Sarana Berhasil!', 'success');
        fetchData();
      }
      setCurrentView('home');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally { setIsAiProcessing(false); }
  };

  const runNeuralForecastAction = async () => {
    if (!getIsActuallyOnline()) return addToast("Fitur AI Forecast membutuhkan koneksi internet", "error");
    setIsAiProcessing(true);
    try {
      const result = await generateNeuralForecast(bookings, inventoryItems);
      setNeuralForecast(result);
      addToast("Prediksi Neural Berhasil Diperbarui", "success");
    } finally { setIsAiProcessing(false); }
  };

  const handleImport = useCallback((data: any) => {
    try {
      if (data.bookings) setBookings(data.bookings);
      if (data.k3) setK3Reports(data.k3);
      if (data.inventory) setInventoryItems(data.inventory);
      addToast("Data berhasil diimpor ke sistem lokal", "success");
    } catch (err) {
      addToast("Gagal mengimpor data neural", "error");
    }
  }, [addToast]);

  const stats = useMemo(() => {
    const totalK3 = k3Reports.length;
    const resolvedK3 = k3Reports.filter(r => r.status === 'Selesai').length;
    return {
      activeBookings: bookings.filter(b => b.tanggal && new Date(b.tanggal).getTime() >= new Date().setHours(0,0,0,0)).length,
      pendingK3: k3Reports.filter(r => r.status !== 'Selesai').length,
      criticalStock: inventoryItems.filter(i => i.stokSekarang < 5).length,
      healthScore: totalK3 > 0 ? Math.round((resolvedK3 / totalK3) * 100) : 100
    };
  }, [bookings, k3Reports, inventoryItems]);

  const chartData = useMemo(() => {
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const bookingsByDay = days.map(day => ({ 
      name: day, 
      count: bookings.filter(b => b.tanggal && new Date(b.tanggal).getDay() === days.indexOf(day)).length 
    }));
    const k3ByCat = k3Reports.reduce((acc: any, curr) => { 
      acc[curr.kategori] = (acc[curr.kategori] || 0) + 1; return acc; 
    }, {});
    const pieData = Object.entries(k3ByCat).map(([name, value]) => ({ name, value }));
    return { bookingsByDay, pieData };
  }, [bookings, k3Reports]);

  const resetInstance = () => {
    if(confirm("PERINGATAN: Ini akan menghapus seluruh data instansi dari perangkat ini. Lanjutkan?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const inputStyles = "w-full glass p-6 rounded-2xl text-sm font-bold bg-white/70 dark:bg-black/60 border border-slate-200 dark:border-emerald-500/10 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all text-slate-900 dark:text-white outline-none";

  if (currentView === 'setup') {
    return (
      <Layout>
        <div className="max-w-md mx-auto glass p-12 rounded-[4rem] shadow-3xl border border-emerald-500/20 animate-fade-in text-center">
           <div className="p-6 bg-emerald-600 rounded-3xl inline-block mb-8 text-white"><ICONS.Sparkles className="w-10 h-10" /></div>
           <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Neural Setup</h2>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Inisialisasi Platform</p>
           <form onSubmit={handleSetupSubmit} className="space-y-6 text-left">
              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nama Instansi</label><input name="name" placeholder="Contoh: SIF Al Fikri" required className={inputStyles} /></div>
              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Slogan</label><input name="slogan" placeholder="Soul of Shalawat" required className={inputStyles} /></div>
              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Sarana (Pisah Koma)</label><textarea name="facilities" placeholder="Aula, Lapangan, Lab..." required className={`${inputStyles} h-24`} /></div>
              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Daftar Unit (Pisah Koma)</label><input name="departments" placeholder="SD, SMP, SMA, HRD" required className={inputStyles} /></div>
              <button type="submit" className="w-full bg-slate-950 text-white p-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all hover:bg-emerald-600">LAUNCH ENGINE</button>
           </form>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Toast toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      <AiAssistant appContext={{ stats, bookings, k3Reports, inventoryItems, tenant }} />

      {currentView === 'home' && (
        <div className="space-y-10 animate-fade-in no-print">
          <header className="glass rounded-[3.5rem] p-12 text-center shadow-2xl relative overflow-hidden border border-white/50 dark:border-emerald-500/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-30"></div>
            <div className="absolute top-10 right-10 flex gap-2">
               <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-4 rounded-3xl bg-slate-50 dark:bg-emerald-950/30 text-slate-500 dark:text-emerald-400 hover:scale-110 active:scale-95 transition-all">
                {theme === 'light' ? <ICONS.Moon className="w-6 h-6" /> : <ICONS.Sun className="w-6 h-6" />}
              </button>
            </div>
            <div className="arabic text-3xl text-emerald-800 dark:text-emerald-400 font-bold mb-2 drop-shadow-sm">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
            <p className="text-[10px] font-black text-emerald-600/60 dark:text-emerald-400/40 uppercase tracking-widest mb-6">{hijriDate}</p>
            <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-3">{tenant.name}</h1>
            <p className="text-slate-400 dark:text-emerald-700 font-black text-[10px] uppercase tracking-[0.5em] mb-10">{tenant.slogan}</p>
            <div className="py-5 px-10 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-[2.5rem] inline-block border border-emerald-500/10 mb-8 backdrop-blur-md">
              <p className="text-emerald-900 dark:text-emerald-100 text-sm italic font-bold">"{welcomeMsg}"</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <span className="flex items-center justify-center gap-3 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-white dark:bg-emerald-950/20 px-6 py-3.5 rounded-full shadow-lg border border-emerald-50 dark:border-emerald-500/10">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse bg-emerald-500`}></span> 
                {stats.healthScore}% OPERATIONAL HEALTH
              </span>
              {syncQueueCount > 0 && (
                <button onClick={processSyncQueue} className="flex items-center justify-center gap-3 text-[10px] font-black text-amber-600 bg-amber-50 px-6 py-3.5 rounded-full border border-amber-200 animate-bounce">
                  {syncQueueCount} DATA MENUNGGU SYNC
                </button>
              )}
            </div>
          </header>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatusBadge type="booking" count={stats.activeBookings} label="Bookings" onClick={() => setCurrentView('tracking')} />
            <StatusBadge type="k3" count={stats.pendingK3} label="K3 Alerts" onClick={() => setCurrentView('k3')} />
            <StatusBadge type="inventory" count={stats.criticalStock} label="Stock Alerts" onClick={() => { if(adminAuth) { setAdminTab('inventory'); setCurrentView('admin'); } else { setCurrentView('admin'); } }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button onClick={() => setCurrentView('booking')} className="glass p-8 rounded-[3rem] text-left border border-white/40 dark:border-emerald-500/10 hover:scale-[1.02] transition-all group overflow-hidden relative">
              <div className="p-5 bg-emerald-500/10 rounded-3xl inline-block mb-6"><ICONS.Booking className="w-8 h-8 text-emerald-600" /></div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Facility Hub</h3>
              <p className="text-xs font-semibold text-slate-400 leading-relaxed">Reservasi sarana prasarana dengan kalender terintegrasi secara cerdas.</p>
            </button>
            <button onClick={() => setCurrentView('k3')} className="glass p-8 rounded-[3rem] text-left border border-white/40 dark:border-rose-500/10 hover:scale-[1.02] transition-all group overflow-hidden relative">
              <div className="p-5 bg-rose-500/10 rounded-3xl inline-block mb-6"><ICONS.Alert className="w-8 h-8 text-rose-600" /></div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Safety Vision</h3>
              <p className="text-xs font-semibold text-slate-400 leading-relaxed">Laporkan kendala fasilitas dengan bantuan audit Neural AI proaktif.</p>
            </button>
            <button onClick={() => setCurrentView('admin')} className="md:col-span-2 glass p-10 rounded-[3rem] flex items-center justify-between border border-slate-900/10 dark:border-emerald-500/5 group hover:bg-slate-950 dark:hover:bg-emerald-950 transition-all">
              <div className="flex items-center gap-8 text-left">
                <div className="p-6 rounded-[2rem] bg-slate-100 dark:bg-emerald-900/30 group-hover:bg-emerald-600 transition-colors">
                  <ICONS.Lock className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-white mb-1 uppercase tracking-tighter">Terminal Command</h3>
                  <p className="text-sm font-bold text-slate-400 group-hover:text-emerald-400/80">Kontrol penuh operasional, inventaris & analitik instansi.</p>
                </div>
              </div>
              <ICONS.ArrowLeft className="w-8 h-8 rotate-180 opacity-20 group-hover:opacity-100 transition-all text-white" />
            </button>
          </div>
        </div>
      )}

      {currentView === 'admin' && adminAuth && (
        <div className="space-y-10 animate-fade-in pb-20">
          <div className="flex flex-col sm:flex-row items-center justify-between glass p-10 rounded-[3.5rem] border border-emerald-500/10 shadow-2xl no-print gap-6">
            <div className="flex items-center gap-8">
              <div className="p-6 bg-emerald-600 text-white rounded-[2rem] shadow-2xl"><ICONS.Lock className="w-8 h-8" /></div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Platinum Terminal</h2>
                <p className="mono text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">{tenant.name}</p>
              </div>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
               <button onClick={resetInstance} className="flex-1 sm:flex-none px-6 py-4 rounded-2xl bg-rose-50 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">RESET</button>
               <button onClick={() => setAdminAuth(false)} className="flex-1 sm:flex-none px-8 py-4 rounded-2xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest transition-all">LOGOUT</button>
            </div>
          </div>

          <div className="flex p-3 bg-slate-100 dark:bg-black/40 rounded-[2.5rem] gap-2 no-print overflow-x-auto no-scrollbar">
            {['overview', 'k3', 'bookings', 'inventory', 'diagnostics'].map((tab) => (
              <button key={tab} onClick={() => setAdminTab(tab as any)} className={`flex-shrink-0 flex-1 py-4 px-6 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === tab ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xl scale-[1.03]' : 'text-slate-400 hover:text-slate-700'}`}>
                {tab}
              </button>
            ))}
          </div>

          {adminTab === 'overview' && (
            <div className="space-y-10 animate-fade-in">
              <div className="glass p-12 rounded-[4rem] bg-slate-950 text-white shadow-3xl relative overflow-hidden no-print">
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em]">Neural Forecast Center</h3>
                    <button onClick={runNeuralForecastAction} disabled={isAiProcessing} className="px-8 py-3 bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 active:scale-95 transition-all">
                      {isAiProcessing ? 'MEMPROSES...' : 'REKALKULASI'}
                    </button>
                  </div>
                  {neuralForecast ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                      <div className="space-y-3"><p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Prediksi Kesibukan</p><p className="text-sm font-bold leading-relaxed">{neuralForecast.predictedBusyDays}</p></div>
                      <div className="space-y-3"><p className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest">Matriks Stok</p><p className="text-sm font-bold leading-relaxed">{neuralForecast.stockAlerts}</p></div>
                      <div className="space-y-3"><p className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest">Saran Inteligensi</p><p className="text-sm italic font-medium leading-relaxed">"{neuralForecast.proactiveTip}"</p></div>
                    </div>
                  ) : <div className="text-center py-6 text-slate-500 text-[10px] font-black uppercase tracking-widest">Klik Rekalkulasi untuk memicu analisis AI</div>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 chart-container no-print">
                <div className="glass p-10 rounded-[3.5rem] border border-white/20 shadow-2xl h-[400px]">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Tren Aktivitas Mingguan</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.bookingsByDay}>
                      <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={5} fill="#10b98120" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass p-10 rounded-[3.5rem] border border-white/20 shadow-2xl h-[400px]">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Distribusi Masalah K3</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData.pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={10} dataKey="value">
                        {chartData.pieData.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#ef4444', '#3b82f6'][i % 4]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass p-12 rounded-[4rem] bg-emerald-600 text-white shadow-3xl text-center no-print">
                 <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Laporan Audit Resmi</h3>
                 <p className="text-sm font-bold opacity-80 mb-8 max-w-md mx-auto">Generate laporan komprehensif seluruh operasional untuk keperluan arsip digital instansi.</p>
                 <button onClick={() => window.print()} className="bg-white text-emerald-600 px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95">CETAK AUDIT</button>
              </div>
            </div>
          )}

          {adminTab === 'inventory' && <AdminInventory items={inventoryItems} onSubmit={handleInventorySubmit} onDelete={handleInventoryDelete} />}
          {adminTab === 'k3' && <AdminK3 reports={k3Reports} onUpdateStatus={handleK3StatusUpdate} />}
          {adminTab === 'diagnostics' && <AdminDiagnostics bookings={bookings} k3={k3Reports} inventory={inventoryItems} onImport={handleImport} />}
        </div>
      )}

      {currentView === 'admin' && !adminAuth && (
        <div className="max-w-md mx-auto glass rounded-[4rem] p-12 text-center animate-fade-in shadow-2xl border border-white/60 no-print">
          <div className="p-7 bg-slate-950 rounded-[2.5rem] inline-block mb-8 shadow-2xl"><ICONS.Lock className="w-12 h-12 text-emerald-500" /></div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Terminal Terkunci</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Dilindungi oleh Neural Core</p>
          <form onSubmit={e => { e.preventDefault(); const pass = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value; if (pass === CONFIG.ADMIN_PASS) { setAdminAuth(true); } else { addToast('PIN Keamanan Salah!', 'error'); } }} className="space-y-5">
            <input name="password" type="password" required className="w-full bg-slate-50 dark:bg-black/60 border-none rounded-[2rem] p-7 text-center text-4xl font-black tracking-widest text-emerald-600 outline-none" placeholder="••••" autoFocus />
            <button type="submit" className="w-full bg-slate-950 text-white p-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all">GRANTED ACCESS</button>
            <button type="button" onClick={() => setCurrentView('home')} className="text-[10px] font-black text-slate-400 uppercase mt-4">BATALKAN</button>
          </form>
        </div>
      )}

      {(currentView === 'booking' || currentView === 'k3') && (
        <div className="glass rounded-[4rem] p-12 shadow-3xl border border-white/50 animate-fade-in no-print">
          <SectionHeader title={currentView === 'booking' ? "Facility Hub" : "Safety Vision"} subtitle={currentView === 'booking' ? "Manajemen reservasi sarana." : "Audit dan pelaporan kendala infrastruktur."} icon={currentView === 'booking' ? <ICONS.Booking className="w-8 h-8" /> : <ICONS.Alert className="w-8 h-8" />} onBack={() => setCurrentView('home')} />
          {currentView === 'k3' ? (
             <form onSubmit={handleK3Submit} className="space-y-8">
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 {K3_CATEGORIES.map((cat) => (
                   <button key={cat.id} type="button" onClick={() => setSelectedK3Category(cat.id)} className={`flex flex-col items-center justify-center p-6 rounded-[2.5rem] border-2 transition-all ${selectedK3Category === cat.id ? 'bg-rose-500 border-rose-500 text-white shadow-2xl scale-105' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-400'}`}>
                     <span className="text-3xl mb-3">{cat.icon}</span>
                     <span className="text-[9px] font-black uppercase tracking-widest text-center">{cat.label}</span>
                   </button>
                 ))}
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nama Pelapor</label><input name="pelapor" required className={inputStyles} /></div>
                 <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Unit</label><select name="divisi" required className={inputStyles}><option value="">Pilih Unit</option>{tenant.departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                 <div className="md:col-span-2 space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Lokasi Terkait</label><input name="lokasi" required className={inputStyles} /></div>
                 <div className="md:col-span-2 space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Deskripsi Masalah</label><textarea name="masalah" required className={`${inputStyles} h-32 resize-none`} /></div>
               </div>
               <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row items-center gap-6">
                    <label className="w-full sm:flex-1 cursor-pointer">
                      <div className="glass p-10 rounded-[2.5rem] border-2 border-dashed border-emerald-500/20 flex flex-col items-center gap-4 text-center hover:border-emerald-500/50 transition-colors">
                        <ICONS.Camera className="w-12 h-12 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">AMBIL FOTO KENDALA</span>
                      </div>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setK3ImagePreview(reader.result as string); reader.readAsDataURL(file); } }} />
                    </label>
                    {k3ImagePreview && (
                      <div className="w-full sm:w-40 h-40 rounded-[2.5rem] overflow-hidden border-4 border-emerald-500 relative group shrink-0">
                        <img src={k3ImagePreview} className="w-full h-full object-cover" alt="Preview" />
                        <button type="button" onClick={() => setK3ImagePreview(null)} className="absolute inset-0 bg-rose-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-black text-[10px]">HAPUS FOTO</button>
                      </div>
                    )}
                 </div>
               </div>
               <button disabled={isAiProcessing} type="submit" className="w-full bg-rose-600 text-white p-8 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-3xl hover:bg-rose-500 transition-all active:scale-95">
                 {isAiProcessing ? 'MEMPROSES DATA NEURAL...' : 'KIRIM LAPORAN K3'}
               </button>
             </form>
          ) : (
             <form onSubmit={handleBookingSubmit} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nama Penanggung Jawab</label><input value={bookingFormData.nama} onChange={e => setBookingFormData({...bookingFormData, nama: e.target.value})} className={inputStyles} required /></div>
                 <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nomor WhatsApp</label><input placeholder="628..." value={bookingFormData.whatsapp} onChange={e => setBookingFormData({...bookingFormData, whatsapp: e.target.value})} className={inputStyles} required /></div>
                 <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Unit/Divisi</label><select value={bookingFormData.divisi} onChange={e => setBookingFormData({...bookingFormData, divisi: e.target.value})} className={inputStyles} required><option value="">Pilih Unit</option>{tenant.departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                 <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Fasilitas/Sarana</label><select value={bookingFormData.sarana} onChange={e => setBookingFormData({...bookingFormData, sarana: e.target.value})} className={inputStyles} required><option value="">Pilih Fasilitas</option>{tenant.facilities.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                 <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Tanggal Pelaksanaan</label><input type="date" value={bookingFormData.tanggal} onChange={e => setBookingFormData({...bookingFormData, tanggal: e.target.value})} className={inputStyles} required /></div>
                 <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Rentang Waktu</label><div className="flex gap-4"><input type="time" value={bookingFormData.mulai} onChange={e => setBookingFormData({...bookingFormData, mulai: e.target.value})} className={inputStyles} required /><input type="time" value={bookingFormData.selesai} onChange={e => setBookingFormData({...bookingFormData, selesai: e.target.value})} className={inputStyles} required /></div></div>
                 <div className="md:col-span-2 space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Detail Keperluan Kegiatan</label><textarea value={bookingFormData.keperluan} onChange={e => setBookingFormData({...bookingFormData, keperluan: e.target.value})} className={`${inputStyles} h-32 resize-none`} required /></div>
               </div>
               <button disabled={isAiProcessing} type="submit" className="w-full bg-emerald-600 text-white p-8 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-3xl active:scale-95 transition-all">
                 {isAiProcessing ? 'MENYELARASKAN RESERVASI...' : 'KONFIRMASI RESERVASI'}
               </button>
             </form>
          )}
        </div>
      )}

      {currentView === 'tracking' && (
        <div className="space-y-8 animate-fade-in no-print">
          <SectionHeader title="Aktivitas Anda" subtitle="Riwayat reservasi sarana proaktif instansi." icon={<div className="text-2xl">📊</div>} onBack={() => setCurrentView('home')} />
          <div className="space-y-5">
            {bookings.filter(b => b.id && userBookingIds.includes(b.id)).length === 0 ? (
              <div className="glass rounded-[3rem] p-20 text-center opacity-50 uppercase font-black text-xs tracking-widest border-2 border-dashed border-emerald-500/20">BELUM ADA AKTIVITAS TERBARU</div>
            ) : (
              bookings.filter(b => b.id && userBookingIds.includes(b.id)).map(b => (
                <div key={b.id} className="glass rounded-[2.5rem] p-8 border border-white/30 shadow-xl dark:border-emerald-500/10">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[9px] font-black px-3 py-1.5 rounded-xl bg-emerald-600 text-white uppercase tracking-widest">AKTIF</span>
                        <span className="mono text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {b.id?.toUpperCase().slice(0, 8)}</span>
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter uppercase">{b.sarana}</h4>
                      <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-wide">📅 {b.tanggal} • ⏰ {b.mulai} - {b.selesai}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-[1.2rem]"><ICONS.Check className="w-6 h-6" /></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
    