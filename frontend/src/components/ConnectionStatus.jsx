// frontend/src/components/ConnectionStatus.jsx
import { useState, useEffect } from 'react';
import { FaWifi, FaWifiSlash, FaSync, FaDatabase } from 'react-icons/fa';
import { isOnline, onConnectionChange, countPendingOperations } from '../services/offlineStorage';
import api from '../axios';

const ConnectionStatus = () => {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Mettre à jour le nombre d'opérations en attente
  const updatePendingCount = async () => {
    const count = await countPendingOperations();
    setPendingCount(count);
  };

  // Synchroniser manuellement
  const handleSync = async () => {
    if (!online) {
      alert('Impossible de synchroniser : vous êtes hors ligne');
      return;
    }
    setSyncing(true);
    try {
      const result = await api.sync();
      await updatePendingCount();
      alert(`✅ Synchronisation terminée : ${result.success} opérations synchronisées`);
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      alert('❌ Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Initialisation
    updatePendingCount();

    // Écouter les changements de connexion
    const cleanup = onConnectionChange((status) => {
      setOnline(status);
      if (status) {
        // Synchroniser automatiquement au retour en ligne
        setTimeout(() => {
          api.sync().then(updatePendingCount);
        }, 3000);
      }
    });

    // Rafraîchir le compteur toutes les 30 secondes
    const interval = setInterval(updatePendingCount, 30000);

    // Re-synchroniser toutes les 5 minutes en ligne
    const syncInterval = setInterval(() => {
      if (online) {
        api.sync().then(updatePendingCount);
      }
    }, 300000);

    return () => {
      cleanup();
      clearInterval(interval);
      clearInterval(syncInterval);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 14px',
      borderRadius: '20px',
      backgroundColor: online ? '#d1fae5' : '#fee2e2',
      color: online ? '#065f46' : '#991b1b',
      fontSize: '13px',
      fontWeight: '500',
      border: `1px solid ${online ? '#a7f3d0' : '#fecaca'}`,
    }}>
      {online ? <FaWifi size={14} /> : <FaWifiSlash size={14} />}
      <span>{online ? 'En ligne' : 'Hors ligne'}</span>
      
      {pendingCount > 0 && (
        <>
          <span style={{
            width: '1px',
            height: '20px',
            backgroundColor: online ? '#065f46' : '#991b1b',
            opacity: 0.3,
          }} />
          <FaDatabase size={12} />
          <span style={{ fontSize: '12px' }}>
            {pendingCount} en attente
          </span>
        </>
      )}
      
      <button
        onClick={handleSync}
        disabled={syncing || !online}
        style={{
          background: 'none',
          border: 'none',
          cursor: syncing || !online ? 'not-allowed' : 'pointer',
          color: online ? '#065f46' : '#991b1b',
          opacity: syncing || !online ? 0.5 : 1,
          padding: '2px 6px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
        }}
        title="Synchroniser maintenant"
      >
        <FaSync size={12} className={syncing ? 'spin' : ''} />
      </button>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ConnectionStatus;