
import React from 'react';
import { K3Report } from '../types';

interface AdminK3Props {
  reports: K3Report[];
  onUpdateStatus: (id: string, status: K3Report['status']) => Promise<void>;
}

export const AdminK3: React.FC<AdminK3Props> = ({ reports, onUpdateStatus }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Resolution Center</h3>
      <div className="space-y-6">
        {reports.map(report => (
          <div key={report.id} className={`glass p-10 rounded-[3.5rem] border-l-8 ${report.status === 'Selesai' ? 'border-emerald-500 opacity-60' : report.status === 'Proses' ? 'border-amber-500' : 'border-rose-500'} shadow-2xl overflow-hidden`}>
            <div className="flex flex-col md:flex-row gap-10">
              {report.foto && <img src={report.foto} className="w-full md:w-48 h-48 object-cover rounded-[2rem] shadow-xl" alt="Report" />}
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase mb-4 inline-block ${report.status === 'Selesai' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                      {report.kategori} • {report.status}
                    </span>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">"{report.masalah}"</h4>
                    <p className="text-xs font-bold text-slate-500 mt-2 uppercase">LOKASI: {report.lokasi} • PELAPOR: {report.pelapor}</p>
                  </div>
                </div>
                {report.suggestion && (
                   <div className="p-5 bg-emerald-500/5 rounded-3xl border border-emerald-500/20">
                     <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 italic">Neural AI Insight:</p>
                     <p className="text-sm font-semibold text-slate-700 dark:text-emerald-400/80">"{report.suggestion}"</p>
                   </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => onUpdateStatus(report.id, 'Proses')} className={`flex-1 p-5 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${report.status === 'Proses' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-white/5'}`}>PROSES</button>
                  <button onClick={() => onUpdateStatus(report.id, 'Selesai')} className={`flex-1 p-5 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${report.status === 'Selesai' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/5'}`}>SELESAI</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
