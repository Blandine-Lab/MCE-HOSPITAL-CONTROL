import axios from 'axios';
import { 
  savePendingOperation, 
  isOnline, 
  syncPendingOperations,
  countPendingOperations 
} from './services/offlineStorage';

// ? Utiliser VITE_API_URL si dfinie, sinon '/api'
const baseURL = import.meta.env.VITE_API_URL || '/api';
console.log('?? BaseURL utilise :', baseURL);

const api = axios.create({
  baseURL,
});

// ============================
// INTERCEPTEUR DE REQUTE
// ============================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Mode hors ligne pour les requtes non-GET
    if (!isOnline() && config.method && config.method.toLowerCase() !== 'get') {
      console.log('?? Mode hors ligne : sauvegarde de l\'opration', config.url);
      
      const entity = config.url.split('/')[1] || 'unknown';
      const action = config.method.toLowerCase();
      
      const promise = savePendingOperation(
        config.url,
        config.method,
        config.data,
        entity,
        action
      );
      
      return Promise.reject({
        __offline: true,
        message: 'Mode hors ligne - Opration sauvegarde',
        config,
        promise,
      });
    }
    
    console.log('?? Requte sortante :', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('? Erreur requte:', error);
    return Promise.reject(error);
  }
);

// ============================
// INTERCEPTEUR DE RPONSE
// ============================
api.interceptors.response.use(
  (response) => {
    console.log('?? Rponse reue :', response.config.url, 'Status:', response.status);
    return response;
  },
  async (error) => {
    if (error && error.__offline) {
      console.log('?? Mode hors ligne - Opration en attente');
      if (error.promise) {
        await error.promise;
      }
      return Promise.resolve({
        data: {
          message: 'Opration sauvegarde pour synchronisation ultrieure',
          offline: true,
          timestamp: new Date().toISOString(),
        },
        status: 202,
        statusText: 'Accepted',
        config: error.config,
      });
    }
    
    if (!error.response && !navigator.onLine) {
      console.warn('?? Pas de connexion rseau');
      return Promise.reject({
        message: 'Mode hors ligne - Pas de connexion',
        offline: true,
      });
    }
    
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      // ... votre logique de refresh token existante
    }
    
    return Promise.reject(error);
  }
);

// ============================
// MTHODE DE FORAGE DE SYNC
// ============================
api.sync = async () => {
  if (!isOnline()) {
    console.warn('?? Hors ligne, impossible de synchroniser');
    return { success: false, message: 'Hors ligne' };
  }
  return await syncPendingOperations(api);
};

api.getPendingCount = async () => {
  return await countPendingOperations();
};

export default api;
