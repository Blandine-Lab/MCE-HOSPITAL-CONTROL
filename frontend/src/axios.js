import axios from 'axios';
import { 
  savePendingOperation, 
  isOnline, 
  syncPendingOperations,
  countPendingOperations 
} from './services/offlineStorage';

// ✅ Utiliser VITE_API_URL si définie, sinon '/api'
const baseURL = import.meta.env.VITE_API_URL || '/api';
console.log('🌐 BaseURL utilisée :', baseURL);

const api = axios.create({
  baseURL,
});

// ============================
// INTERCEPTEUR DE REQUÊTE
// ============================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Mode hors ligne pour les requêtes non-GET
    if (!isOnline() && config.method && config.method.toLowerCase() !== 'get') {
      console.log('📴 Mode hors ligne : sauvegarde de l\'opération', config.url);
      
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
        message: 'Mode hors ligne - Opération sauvegardée',
        config,
        promise,
      });
    }
    
    console.log('📤 Requête sortante :', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Erreur requête:', error);
    return Promise.reject(error);
  }
);

// ============================
// INTERCEPTEUR DE RÉPONSE
// ============================
api.interceptors.response.use(
  (response) => {
    console.log('📥 Réponse reçue :', response.config.url, 'Status:', response.status);
    return response;
  },
  async (error) => {
    if (error && error.__offline) {
      console.log('📴 Mode hors ligne - Opération en attente');
      if (error.promise) {
        await error.promise;
      }
      return Promise.resolve({
        data: {
          message: 'Opération sauvegardée pour synchronisation ultérieure',
          offline: true,
          timestamp: new Date().toISOString(),
        },
        status: 202,
        statusText: 'Accepted',
        config: error.config,
      });
    }
    
    if (!error.response && !navigator.onLine) {
      console.warn('⚠️ Pas de connexion réseau');
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
// MÉTHODE DE FORÇAGE DE SYNC
// ============================
api.sync = async () => {
  if (!isOnline()) {
    console.warn('⚠️ Hors ligne, impossible de synchroniser');
    return { success: false, message: 'Hors ligne' };
  }
  return await syncPendingOperations(api);
};

api.getPendingCount = async () => {
  return await countPendingOperations();
};

export default api;