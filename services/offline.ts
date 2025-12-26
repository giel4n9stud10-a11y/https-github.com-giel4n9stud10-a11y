
export const OFFLINE_STORAGE_KEYS = {
  BOOKINGS: 'platinum_cache_bookings',
  K3: 'platinum_cache_k3',
  INVENTORY: 'platinum_cache_inventory',
  SYNC_QUEUE: 'platinum_sync_queue',
  MOCK_OFFLINE: 'platinum_mock_offline'
};

export const setMockOffline = (status: boolean) => {
  localStorage.setItem(OFFLINE_STORAGE_KEYS.MOCK_OFFLINE, status ? 'true' : 'false');
  window.dispatchEvent(new Event(status ? 'offline' : 'online'));
};

export const getIsActuallyOnline = () => {
  const isMocked = localStorage.getItem(OFFLINE_STORAGE_KEYS.MOCK_OFFLINE) === 'true';
  return navigator.onLine && !isMocked;
};

export const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(base64Str);
  });
};

export const saveToCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("Storage full", e);
  }
};

export const getFromCache = (key: string) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

export const addToSyncQueue = (table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => {
  const queue = getFromCache(OFFLINE_STORAGE_KEYS.SYNC_QUEUE) || [];
  queue.push({ 
    id: Date.now() + Math.random(), 
    table, 
    action, 
    payload, 
    timestamp: new Date().toISOString() 
  });
  saveToCache(OFFLINE_STORAGE_KEYS.SYNC_QUEUE, queue);
};

export const clearSyncQueue = () => {
  localStorage.removeItem(OFFLINE_STORAGE_KEYS.SYNC_QUEUE);
};

export const isLowEndDevice = () => {
  const memory = (navigator as any).deviceMemory;
  const isOldAndroid = /Android 4|Android 5|Android 6|Android 7|Android 8/i.test(navigator.userAgent);
  return (memory && memory <= 4) || isOldAndroid;
};
