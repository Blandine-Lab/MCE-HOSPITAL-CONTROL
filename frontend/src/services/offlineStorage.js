// frontend/src/services/offlineStorage.js
import localforage from 'localforage';

// Configuration des stores IndexedDB
const stores = {
  patients: localforage.createInstance({ 
    name: 'MCE_Offline', 
    storeName: 'patients',
    description: 'Patients en cache'
  }),
  rendezvous: localforage.createInstance({ 
    name: 'MCE_Offline', 
    storeName: 'rendezvous',
    description: 'Rendez-vous en cache'
  }),
  signalements: localforage.createInstance({ 
    name: 'MCE_Offline', 
    storeName: 'signalements',
    description: 'Signalements en cache'
  }),
  factures: localforage.createInstance({ 
    name: 'MCE_Offline', 
    storeName: 'factures',
    description: 'Factures en cache'
  }),
  pendingOperations: localforage.createInstance({ 
    name: 'MCE_Offline', 
    storeName: 'pendingOps',
    description: 'Opérations en attente'
  }),
};

// ============================
// OPÉRATIONS EN ATTENTE
// ============================

/**
 * Sauvegarder une opération en attente
 */
export const savePendingOperation = async (url, method, data, entity, action) => {
  const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const operation = {
    id,
    url,
    method: method.toUpperCase(),
    data,
    entity,
    action,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };
  await stores.pendingOperations.setItem(id, operation);
  console.log('💾 Opération en attente sauvegardée:', id, operation);
  return id;
};

/**
 * Récupérer toutes les opérations en attente
 */
export const getPendingOperations = async () => {
  const operations = [];
  await stores.pendingOperations.iterate((value) => {
    operations.push(value);
  });
  return operations;
};

/**
 * Récupérer les opérations en attente pour une entité spécifique
 */
export const getPendingOperationsByEntity = async (entity) => {
  const operations = [];
  await stores.pendingOperations.iterate((value) => {
    if (value.entity === entity) {
      operations.push(value);
    }
  });
  return operations;
};

/**
 * Supprimer une opération en attente
 */
export const removePendingOperation = async (id) => {
  await stores.pendingOperations.removeItem(id);
  console.log('🗑️ Opération supprimée:', id);
};

/**
 * Mettre à jour le compteur de tentatives
 */
export const incrementRetryCount = async (id) => {
  const op = await stores.pendingOperations.getItem(id);
  if (op) {
    op.retryCount = (op.retryCount || 0) + 1;
    await stores.pendingOperations.setItem(id, op);
  }
};

/**
 * Vider toutes les opérations en attente
 */
export const clearPendingOperations = async () => {
  await stores.pendingOperations.clear();
  console.log('🗑️ Toutes les opérations supprimées');
};

/**
 * Compter les opérations en attente
 */
export const countPendingOperations = async () => {
  let count = 0;
  await stores.pendingOperations.iterate(() => { count++; });
  return count;
};

// ============================
// CACHE DES DONNÉES
// ============================

/**
 * Sauvegarder des données en cache
 */
export const saveLocalData = async (storeName, key, data) => {
  if (!stores[storeName]) {
    console.warn(`⚠️ Store ${storeName} non existant`);
    return;
  }
  await stores[storeName].setItem(key, data);
  console.log(`💾 Données sauvegardées dans ${storeName}:`, key);
};

/**
 * Récupérer des données du cache
 */
export const getLocalData = async (storeName, key) => {
  if (!stores[storeName]) return null;
  return await stores[storeName].getItem(key);
};

/**
 * Récupérer toutes les données d'un store
 */
export const getAllLocalData = async (storeName) => {
  if (!stores[storeName]) return [];
  const results = [];
  await stores[storeName].iterate((value) => {
    results.push(value);
  });
  return results;
};

/**
 * Supprimer des données du cache
 */
export const removeLocalData = async (storeName, key) => {
  if (!stores[storeName]) return;
  await stores[storeName].removeItem(key);
  console.log(`🗑️ Données supprimées de ${storeName}:`, key);
};

/**
 * Vider un store
 */
export const clearLocalStore = async (storeName) => {
  if (!stores[storeName]) return;
  await stores[storeName].clear();
  console.log(`🗑️ Store ${storeName} vidé`);
};

// ============================
// UTILITAIRES CONNEXION
// ============================

/**
 * Vérifier l'état de la connexion
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Écouter les changements de connexion
 */
export const onConnectionChange = (callback) => {
  const handleOnline = () => {
    console.log('🌐 Connexion rétablie');
    callback(true);
  };
  const handleOffline = () => {
    console.log('📴 Connexion perdue');
    callback(false);
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// ============================
// SYNCHRONISATION
// ============================

/**
 * Synchroniser les opérations en attente
 */
export const syncPendingOperations = async (api) => {
  const operations = await getPendingOperations();
  const total = operations.length;
  
  if (total === 0) {
    console.log('✅ Aucune opération en attente');
    return { success: true, total: 0 };
  }
  
  console.log(`🔄 Synchronisation de ${total} opération(s)...`);
  
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };
  
  for (const op of operations) {
    try {
      // Vérifier le nombre de tentatives (max 5)
      if (op.retryCount >= 5) {
        console.warn(`⚠️ Opération ${op.id} abandonnée (trop de tentatives)`);
        await removePendingOperation(op.id);
        results.failed++;
        results.errors.push({ id: op.id, error: 'Max retries exceeded' });
        continue;
      }
      
      console.log(`📤 Synchronisation ${op.method} ${op.url}`);
      
      const response = await api({
        method: op.method,
        url: op.url,
        data: op.data,
      });
      
      if (response.status >= 200 && response.status < 300) {
        await removePendingOperation(op.id);
        results.success++;
        console.log(`✅ Opération ${op.id} synchronisée`);
      } else {
        await incrementRetryCount(op.id);
        results.failed++;
        results.errors.push({ id: op.id, error: `HTTP ${response.status}` });
        console.warn(`⚠️ Échec synchronisation ${op.id} (${response.status})`);
      }
    } catch (error) {
      await incrementRetryCount(op.id);
      results.failed++;
      results.errors.push({ id: op.id, error: error.message });
      console.error(`❌ Échec synchronisation ${op.id}:`, error.message);
    }
  }
  
  console.log(`✅ Synchronisation terminée : ${results.success} réussis, ${results.failed} échoués`);
  return results;
};

// Exporter l'API complète
export default {
  savePendingOperation,
  getPendingOperations,
  getPendingOperationsByEntity,
  removePendingOperation,
  incrementRetryCount,
  clearPendingOperations,
  countPendingOperations,
  saveLocalData,
  getLocalData,
  getAllLocalData,
  removeLocalData,
  clearLocalStore,
  isOnline,
  onConnectionChange,
  syncPendingOperations,
};
