
export type View = 'home' | 'booking' | 'k3' | 'admin' | 'admin-dashboard' | 'calendar' | 'tracking' | 'setup';

export interface TenantConfig {
  id: string;
  name: string;
  slogan: string;
  facilities: string[];
  departments: string[];
  logo_url?: string;
}

export interface Booking {
  id?: string;
  tenant_id?: string;
  nama: string;
  whatsapp: string;
  divisi: string;
  sarana: string;
  alat: string[];
  tanggal: string;
  mulai: string;
  selesai: string;
  keperluan: string;
  createdAt?: string;
}

export interface K3Report {
  id: string;
  tenant_id?: string;
  lokasi: string;
  masalah: string;
  prioritas: 'Penting' | 'Sedang' | 'Biasa';
  kategori: string;
  foto?: string;
  status: 'Belum Selesai' | 'Proses' | 'Selesai';
  pelapor: string;
  divisi: string;
  suggestion?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  tenant_id?: string;
  nama: string;
  merkType: string;
  kategori: string;
  satuan: string;
  stokAwal: number;
  stokSekarang: number;
  lokasi: string;
  kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  lastUpdated: string;
}

export interface SystemBug {
  id: string;
  error_message: string;
  component_stack?: string;
  severity: 'Critical' | 'Warning' | 'Logic';
  status: 'Open' | 'Fixed';
  ai_analysis?: string;
  createdAt: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}
