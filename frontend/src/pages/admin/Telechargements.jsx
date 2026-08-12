import { useEffect, useState } from 'react';
import api from '../../axios'; // ✅ Utilisation de l'instance partagée

const Telechargements = () => {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    api.get('/logs')
      .then(res => setLogs(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Historique des téléchargements</h1>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Fichier</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Adresse IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="px-4 py-2">{new Date(log.date_telechargement).toLocaleString()}</td>
                  <td className="px-4 py-2">{log.nom_fichier}</td>
                  <td className="px-4 py-2">{log.type}</td>
                  <td className="px-4 py-2">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Telechargements;
