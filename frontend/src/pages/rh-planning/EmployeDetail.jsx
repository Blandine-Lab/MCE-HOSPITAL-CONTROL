// src/pages/rh-planning/EmployeDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { 
  FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaBriefcase, 
  FaBuilding, FaCalendar, FaEdit, FaFileContract, FaTimes, 
  FaSave, FaPlus, FaTrash 
} from 'react-icons/fa';

const EmployeDetail = () => {
  const { id } = useParams();
  const [employe, setEmploye] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // États pour lFCéditeur de contrat
  const [showEditor, setShowEditor] = useState(false);
  const [articles, setArticles] = useState([]);
  const [salaire, setSalaire] = useState('');
  const [contratType, setContratType] = useState('CDI');

  useEffect(() => {
    api.get(`/employes/${id}`)
      .then(res => { setEmploye(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [id]);

  // Articles par défaut (fallback)
  const getDefaultArticles = (salaireValue) => [
    { id: 1, texte: 'Le présent contrat est régi par le Code du travail.' },
    { id: 2, texte: 'La période d\'essai est de 2 mois renouvelable une fois.' },
    { id: 3, texte: `Le salaire mensuel brut est de ${salaireValue || '2500'} FC.` },
    { id: 4, texte: 'Les horaires de travail sont de 35 heures par semaine.' },
    { id: 5, texte: 'Le lieu de travail est fixé à l\'établissement de l\'employeur.' },
    { id: 6, texte: 'Le salarié bénéficie de 5 semaines de congés payés par an.' },
  ];

  const openEditor = async () => {
    setShowEditor(true);
    setGenerating(true);
    try {
      // Récupérer les articles par défaut depuis le backend (selon le type de contrat)
      const res = await api.get(`/contrats/articles?type=${contratType}`);
      setArticles(res.data.articles || getDefaultArticles(employe.salaire));
      setSalaire(res.data.salaire || employe.salaire || '2500');
    } catch (err) {
      // Fallback : articles par défaut
      setArticles(getDefaultArticles(employe.salaire));
      setSalaire(employe.salaire || '2500');
    } finally {
      setGenerating(false);
    }
  };

  // Ajouter un article vide
  const addArticle = () => {
    const newId = articles.length > 0 ? Math.max(...articles.map(a => a.id)) + 1 : 1;
    setArticles([...articles, { id: newId, texte: '' }]);
  };

  // Supprimer un article
  const removeArticle = (index) => {
    if (articles.length <= 1) return; // garder au moins un article
    const updated = [...articles];
    updated.splice(index, 1);
    setArticles(updated);
  };

  const handleArticleChange = (index, newText) => {
    const updated = [...articles];
    updated[index].texte = newText;
    setArticles(updated);
  };

  const handleGenerateCustom = async () => {
    // Filtrer les articles vides pour ne pas les envoyer
    const filteredArticles = articles.filter(a => a.texte.trim() !== '');
    if (filteredArticles.length === 0) {
      alert('Veuillez ajouter au moins un article non vide.');
      return;
    }

    setGenerating(true);
    try {
      const response = await api.post(`/contrats/generate/${id}`, {
        articles: filteredArticles,
        salaire: salaire,
        type: contratType,
        employe: employe
      }, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contrat_${employe.nom}_${employe.prenom}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowEditor(false);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la génération du contrat personnalisé.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div style={{textAlign:'center', padding:60}}>⏳ Chargement...</div>;
  if (!employe) return <div style={{textAlign:'center', padding:60}}>Employé non trouvé</div>;

  return (
    <div>
      <Link to="/rh/employes" style={{display:'inline-flex', alignItems:'center', gap:8, color:'#3b82f6', textDecoration:'none'}}>
        <FaArrowLeft /> Retour
      </Link>
      <div style={{backgroundColor:'white', borderRadius:12, padding:32, marginTop:16, boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16}}>
          <h1 style={{margin:0}}>{employe.prenom} {employe.nom}</h1>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <Link to={`/rh/employes/${id}/edit`} style={{backgroundColor:'#f59e0b', color:'white', padding:'8px 16px', borderRadius:8, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6}}>
              <FaEdit /> Modifier
            </Link>
            <button onClick={openEditor} style={{backgroundColor:'#10b981', color:'white', padding:'8px 16px', borderRadius:8, border:'none', display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer'}}>
              <FaFileContract /> Générer le contrat
            </button>
          </div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop:24}}>
          <div><FaUser style={{marginRight:8}} /> <strong>Poste :</strong> {employe.poste || '-'}</div>
          <div><FaBuilding style={{marginRight:8}} /> <strong>Service :</strong> {employe.service_nom || '-'}</div>
          <div><FaEnvelope style={{marginRight:8}} /> <strong>Email :</strong> {employe.email || '-'}</div>
          <div><FaPhone style={{marginRight:8}} /> <strong>Téléphone :</strong> {employe.telephone || '-'}</div>
          <div><FaCalendar style={{marginRight:8}} /> <strong>Date d'embauche :</strong> {employe.date_embauche ? new Date(employe.date_embauche).toLocaleDateString('fr-FR') : '-'}</div>
          <div><strong>Statut :</strong> {employe.statut === 'actif' ? '🟢 Actif' : '🔴 Inactif'}</div>
        </div>
      </div>

      {/* ========== MODAL ÉDITEUR DE CONTRAT AVEC ARTICLES DYNAMIQUES ========== */}
      {showEditor && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 32,
            maxWidth: 900,
            width: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
              <h2 style={{margin:0}}>✏️ Personnaliser le contrat</h2>
              <button onClick={() => setShowEditor(false)} style={{background:'none', border:'none', fontSize:24, cursor:'pointer'}}><FaTimes /></button>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>
              <div>
                <label style={{fontWeight:500, display:'block', marginBottom:4}}>Type de contrat</label>
                <select value={contratType} onChange={e => setContratType(e.target.value)} style={{width:'100%', padding:8, border:'1px solid #e2e8f0', borderRadius:6}}>
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="Intérim">Intérim</option>
                  <option value="Stage">Stage</option>
                </select>
              </div>
              <div>
                <label style={{fontWeight:500, display:'block', marginBottom:4}}>Salaire mensuel brut (FC)</label>
                <input type="number" value={salaire} onChange={e => setSalaire(e.target.value)} style={{width:'100%', padding:8, border:'1px solid #e2e8f0', borderRadius:6}} />
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <label style={{fontWeight:500}}>Articles du contrat ({articles.length})</label>
                <button onClick={addArticle} style={{backgroundColor:'#3b82f6', color:'white', padding:'4px 12px', border:'none', borderRadius:4, display:'inline-flex', alignItems:'center', gap:4, cursor:'pointer'}}>
                  <FaPlus /> Ajouter un article
                </button>
              </div>
              <div style={{maxHeight:'400px', overflowY:'auto', paddingRight:4}}>
                {articles.map((art, idx) => (
                  <div key={art.id} style={{display:'flex', gap:8, alignItems:'flex-start', marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                        <span style={{fontWeight:'bold', fontSize:13, color:'#4b5563'}}>Article {idx+1}</span>
                        {articles.length > 1 && (
                          <button onClick={() => removeArticle(idx)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer', fontSize:14}} title="Supprimer">
                            <FaTrash />
                          </button>
                        )}
                      </div>
                      <textarea
                        value={art.texte}
                        onChange={e => handleArticleChange(idx, e.target.value)}
                        rows={2}
                        placeholder="Texte de l'article..."
                        style={{width:'100%', padding:8, border:'1px solid #e2e8f0', borderRadius:6, fontFamily:'inherit'}}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:'flex', gap:12, justifyContent:'flex-end', borderTop:'1px solid #e2e8f0', paddingTop:16}}>
              <button onClick={() => setShowEditor(false)} style={{backgroundColor:'#e5e7eb', padding:'10px 20px', border:'none', borderRadius:6, cursor:'pointer'}}>Annuler</button>
              <button onClick={handleGenerateCustom} disabled={generating} style={{backgroundColor:'#10b981', color:'white', padding:'10px 20px', border:'none', borderRadius:6, cursor:'pointer', opacity:generating?0.6:1}}>
                <FaSave style={{marginRight:6}} /> {generating ? 'Génération...' : 'Générer le PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeDetail;
