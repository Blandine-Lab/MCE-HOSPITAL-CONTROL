import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave, FaPrint, FaFileAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const GenerationContrat = () => {
  const navigate = useNavigate();
  const [employes, setEmployes] = useState([]);
  const [modeles, setModeles] = useState([]);
  const [selectedEmploye, setSelectedEmploye] = useState('');
  const [selectedModele, setSelectedModele] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [salaire, setSalaire] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contratGenere, setContratGenere] = useState(null);
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/employes'),
      api.get('/modeles-contrats')
    ]).then(([empRes, modRes]) => {
      setEmployes(empRes.data);
      setModeles(modRes.data);
    }).catch(console.error);
  }, []);

  const handleGenerer = async (e) => {
    e.preventDefault();
    if (!selectedEmploye || !selectedModele) {
      setError('Veuillez sélectionner un employé et un modèle');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/contrats/generer', {
        employe_id: selectedEmploye,
        modele_id: selectedModele,
        date_debut: dateDebut,
        date_fin: dateFin,
        salaire: salaire
      });
      setContratGenere(res.data.contrat);
      // Récupérer les articles du contrat généré
      const detailRes = await api.get(`/contrats/${res.data.contrat.id}`);
      setArticles(detailRes.data.articles);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la génération');
      setLoading(false);
    }
  };

  const handleUpdateArticle = (index, newContenu) => {
    const updated = [...articles];
    updated[index].contenu = newContenu;
    setArticles(updated);
  };

  const handleSave = async () => {
    if (!contratGenere) return;
    try {
      await api.put(`/contrats/${contratGenere.id}/articles`, { articles });
      navigate(`/rh/contrats/${contratGenere.id}`);
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link to="/rh/contrats" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3b82f6', textDecoration: 'none' }}>
          <FaArrowLeft /> Retour
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0 }}>Générer un contrat</h2>
        {error && <div style={{ color: '#ef4444', padding: 12, backgroundColor: '#fee2e2', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
        
        <form onSubmit={handleGenerer} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Employé *</label>
            <select value={selectedEmploye} onChange={e => setSelectedEmploye(e.target.value)} required style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}>
              <option value="">Sélectionner</option>
              {employes.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Modèle de contrat *</label>
            <select value={selectedModele} onChange={e => setSelectedModele(e.target.value)} required style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}>
              <option value="">Sélectionner</option>
              {modeles.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Date de début</label>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Date de fin (si CDD)</label>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Salaire (FC)</label>
            <input type="number" step="0.01" value={salaire} onChange={e => setSalaire(e.target.value)} placeholder="ex: 2500.00" style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#3b82f6', color: 'white', padding: '10px 24px', border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              <FaFileAlt /> {loading ? 'Génération...' : 'Générer le contrat'}
            </button>
          </div>
        </form>
      </div>

      {contratGenere && (
        <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, marginTop: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>Contrat généréFC{contratGenere.reference}</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleSave} style={{ backgroundColor: '#10b981', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                <FaSave /> Sauvegarder
              </button>
              <button onClick={handlePrint} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                <FaPrint /> Imprimer
              </button>
            </div>
          </div>

          <div id="contrat-print">
            <h2 style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 16 }}>
              CONTRAT DE TRAVAIL
            </h2>
            {articles.map((art, idx) => (
              <div key={art.id} style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '8px 0 4px 0', color: '#0f172a' }}>{art.titre}</h4>
                <textarea
                  value={art.contenu}
                  onChange={e => handleUpdateArticle(idx, e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, fontFamily: 'inherit' }}
                />
              </div>
            ))}
          </div>

          <style>{`
            @media print {
              .no-print { display: none !important; }
              #contrat-print textarea { border: none; resize: none; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default GenerationContrat;
