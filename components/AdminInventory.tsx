
import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types';
import { ICONS, INVENTORY_CATEGORIES, INVENTORY_UNITS, WAREHOUSE_LOCATIONS } from '../constants';

interface AdminInventoryProps {
  items: InventoryItem[];
  onSubmit: (data: any, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 dark:text-emerald-500/60 uppercase tracking-[0.2em] ml-2">
      {label}
    </label>
    {children}
  </div>
);

export const AdminInventory: React.FC<AdminInventoryProps> = ({ items, onSubmit, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const inputStyles = "w-full glass p-5 rounded-2xl text-sm font-bold bg-white/70 dark:bg-black/60 border border-slate-200 dark:border-emerald-500/10 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all text-slate-900 dark:text-white";

  // Neural Filter - Mengurangi beban CPU HP low-end
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i => 
      i.nama.toLowerCase().includes(q) || 
      i.merkType.toLowerCase().includes(q) ||
      i.kategori.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isProcessing) return; // Atomic Lock

    setIsProcessing(true);
    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      await onSubmit(data, editingItem?.id);
      setShowForm(false);
      setEditingItem(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Inventory Ledger</h3>
          <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">Atomic Data Integrity</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
             <input 
               type="text" 
               placeholder="CARI ASET..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full glass py-3 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest border-emerald-500/10"
             />
          </div>
          <button 
            onClick={() => { setEditingItem(null); setShowForm(true); }}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
          >
            NEW ASSET
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass p-10 rounded-[3.5rem] border border-emerald-500/20 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Nama Aset"><input name="nama" defaultValue={editingItem?.nama} required className={inputStyles} /></FormField>
              <FormField label="Merk/Type"><input name="merkType" defaultValue={editingItem?.merkType} required className={inputStyles} /></FormField>
              <FormField label="Kategori">
                <select name="kategori" defaultValue={editingItem?.kategori} className={inputStyles}>
                  {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Satuan">
                <select name="satuan" defaultValue={editingItem?.satuan} className={inputStyles}>
                  {INVENTORY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </FormField>
              <FormField label="Stok Sekarang"><input type="number" name="stokSekarang" defaultValue={editingItem?.stokSekarang} required className={inputStyles} /></FormField>
              <FormField label="Lokasi Penyimpanan">
                <select name="lokasi" defaultValue={editingItem?.lokasi} className={inputStyles}>
                  {WAREHOUSE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </FormField>
            </div>
            <div className="flex gap-4">
              <button disabled={isProcessing} type="submit" className="flex-1 bg-emerald-600 text-white p-6 rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50">
                {isProcessing ? 'PROCESSING...' : 'SYNC DATA'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-10 bg-slate-100 dark:bg-white/5 p-6 rounded-2xl font-black text-[10px] uppercase tracking-widest">CANCEL</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredItems.length === 0 ? (
          <div className="md:col-span-2 text-center py-20 opacity-30 text-[10px] font-black uppercase tracking-[0.5em]">No Assets Found</div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="glass p-8 rounded-[2.5rem] border border-white/40 flex items-center justify-between group hover:shadow-2xl transition-all">
              <div>
                <span className="text-[9px] font-black text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">{item.kategori}</span>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">{item.nama}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{item.lokasi}</p>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => { setEditingItem(item); setShowForm(true); }} className="text-[9px] font-black uppercase text-emerald-600 hover:text-emerald-400">Edit</button>
                  <button onClick={() => onDelete(item.id)} className="text-[9px] font-black uppercase text-rose-600 hover:text-rose-400">Delete</button>
                </div>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-black ${item.stokSekarang < 5 ? 'text-rose-600' : 'text-emerald-600'}`}>{item.stokSekarang}</div>
                <div className="text-[8px] font-black text-slate-400 uppercase">{item.satuan}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
