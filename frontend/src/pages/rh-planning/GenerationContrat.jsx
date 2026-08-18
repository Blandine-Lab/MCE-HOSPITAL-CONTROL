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
  const [employeDetail, setEmployeDetail] = useState(null);
  const [contenuContrat, setContenuContrat] = useState('');

  // Fonction pour convertir le Markdown de base (gras, italique, sauts de ligne) en HTML
  const markdownToHtml = (texte) => {
    if (!texte) return '';
    let html = texte;
    // Gras : **texte** -> <strong>texte</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italique : *texte* -> <em>texte</em>
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Sauts de ligne : \n -> <br />
    html = html.replace(/\n/g, '<br />');
    return html;
  };

  // Charger les employés et modèles
  useEffect(() => {
    Promise.all([
      api.get('/employes'),
      api.get('/contrats/modeles-contrats')
    ]).then(([empRes, modRes]) => {
      setEmployes(empRes.data);
      setModeles(modRes.data);
    }).catch(err => {
      console.error('Erreur chargement des données :', err);
      setError('Impossible de charger les données');
    });
  }, []);

  // Détails de l'employé
  useEffect(() => {
    if (selectedEmploye) {
      const emp = employes.find(e => e.id === parseInt(selectedEmploye));
      setEmployeDetail(emp || null);
    } else {
      setEmployeDetail(null);
    }
  }, [selectedEmploye, employes]);

  // Charger le contenu du modèle sélectionné
  useEffect(() => {
    if (selectedModele) {
      const modele = modeles.find(m => m.id === parseInt(selectedModele));
      if (modele && modele.contenu) {
        setContenuContrat(modele.contenu);
      } else {
        setContenuContrat('');
      }
    } else {
      setContenuContrat('');
    }
  }, [selectedModele, modeles]);

  // Fonction de remplacement des placeholders
  const remplacerPlaceholders = (texte, data) => {
    if (!texte) return '';
    let result = texte;
    const remplacements = {
      '{{EMPLOYE_NOM}}': data.nom || '',
      '{{EMPLOYE_PRENOM}}': data.prenom || '',
      '{{POSTE}}': data.poste || '',
      '{{SERVICE}}': data.service || '',
      '{{DATE_DEBUT}}': data.date_debut || '',
      '{{DATE_FIN}}': data.date_fin || '',
      '{{SALAIRE}}': data.salaire || '',
      '{{TYPE_CONTRAT}}': data.type_contrat || '',
      '{{DATE_SIGNATURE}}': data.date_signature || new Date().toLocaleDateString('fr-FR'),
    };
    for (const [key, value] of Object.entries(remplacements)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }
    return result;
  };

  // Générer le contrat
  const handleGenerer = async (e) => {
    e.preventDefault();
    if (!selectedEmploye || !selectedModele) {
      setError('Veuillez sélectionner un employé et un modèle');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const emp = employeDetail;
      const serviceNom = emp.service_nom || emp.service || 'Non défini';
      const data = {
        nom: emp.nom || '',
        prenom: emp.prenom || '',
        poste: emp.poste || 'Non défini',
        service: serviceNom,
        date_debut: dateDebut ? new Date(dateDebut).toLocaleDateString('fr-FR') : '',
        date_fin: dateFin ? new Date(dateFin).toLocaleDateString('fr-FR') : '',
        salaire: salaire || '0',
        type_contrat: modeles.find(m => m.id === parseInt(selectedModele))?.nom || 'CDI',
        date_signature: new Date().toLocaleDateString('fr-FR'),
      };
      const contenuFinal = remplacerPlaceholders(contenuContrat, data);

      // Appel API pour créer le contrat
      const res = await api.post('/contrats/generer', {
        employe_id: selectedEmploye,
        modele_id: selectedModele,
        date_debut: dateDebut,
        date_fin: dateFin,
        salaire: salaire,
        contenu: contenuFinal
      });
      setContratGenere(res.data.contrat);
      setContenuContrat(contenuFinal);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la génération');
      setLoading(false);
    }
  };

  // Sauvegarder les modifications
  const handleSave = async () => {
    if (!contratGenere) return;
    try {
      await api.put(`/contrats/${contratGenere.id}`, {
        contenu: contenuContrat
      });
      navigate(`/rh/contrats/print/${contratGenere.id}`);
    } catch (err) {
      setError('Erreur lors de la sauvegarde du contrat');
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const logoUrl = '/logo.jpeg';

  return (
    <div>
      <div style={{ marginBottom: 24 }} className="no-print">
        <Link to="/rh/contrats" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3b82f6', textDecoration: 'none' }}>
          <FaArrowLeft /> Retour
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} className="no-print">
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

      {contratGenere && employeDetail && (
        <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, marginTop: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }} className="no-print">
            <h3 style={{ margin: 0 }}>Contrat généré – {contratGenere.reference}</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleSave} style={{ backgroundColor: '#10b981', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                <FaSave /> Sauvegarder
              </button>
              <button onClick={handlePrint} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                <FaPrint /> Imprimer
              </button>
            </div>
          </div>

          <div id="contrat-print" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* En-tête */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', borderBottom: '3px solid #2563eb', paddingBottom: '16px', marginBottom: '24px' }}>
              <img
                src={logoUrl}
                alt="Logo MCE"
                style={{ height: '60px', width: 'auto', objectFit: 'contain' }}
                onError={(e) => e.target.style.display = 'none'}
              />
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, letterSpacing: '2px' }}>HÔPITAL MCE</h1>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Medical Center Elizabeth – Bukavu</p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                  Avenue BOBZO, Quartier NDENDERE, Commune d'IBANDA, SUD-KIVU/RDC
                </p>
              </div>
            </div>

            <h2 style={{ textAlign: 'center', color: '#1e3a8a', marginBottom: '24px' }}>CONTRAT DE TRAVAIL</h2>

            {/* Informations générales */}
            <div style={{
              marginBottom: '20px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px 20px',
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <p><strong>Référence :</strong> {contratGenere.reference || 'N/A'}</p>
              <p><strong>Employé :</strong> {employeDetail.prenom} {employeDetail.nom}</p>
              <p><strong>Poste :</strong> {employeDetail.poste || 'Non défini'}</p>
              <p><strong>Service :</strong> {employeDetail.service_nom || employeDetail.service || 'Non défini'}</p>
              <p><strong>Type :</strong> {contratGenere.type || 'CDI'}</p>
              <p><strong>Statut :</strong> {contratGenere.statut || 'actif'}</p>
              <p><strong>Date début :</strong> {contratGenere.date_debut ? new Date(contratGenere.date_debut).toLocaleDateString('fr-FR') : 'Non définie'}</p>
              <p><strong>Date fin :</strong> {contratGenere.date_fin ? new Date(contratGenere.date_fin).toLocaleDateString('fr-FR') : 'Non définie'}</p>
              <p><strong>Salaire :</strong> {contratGenere.salaire ? `${parseFloat(contratGenere.salaire).toFixed(2)} FC` : 'Non défini'}</p>
            </div>

            <hr style={{ margin: '20px 0' }} />

            {/* Texte du contrat modifiable */}
            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginBottom: 12 }}>Contenu du contrat</h4>
              <textarea
                value={contenuContrat}
                onChange={(e) => setContenuContrat(e.target.value)}
                rows={25}
                style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 6, fontFamily: 'monospace', fontSize: '14px' }}
                className="no-print"
              />
              {/* Affichage pour l'impression (avec interprétation Markdown) */}
              <div className="print-only" style={{ fontSize: '12px' }}>
                <div dangerouslySetInnerHTML={{ __html: markdownToHtml(contenuContrat) }} />
              </div>
            </div>

            {/* Signatures */}
            <div style={{ marginTop: '40px', borderTop: '2px solid #e2e8f0', paddingTop: '20px' }}>
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', marginBottom: '24px' }}>
                Fait à Bukavu, le {new Date().toLocaleDateString('fr-FR')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '30px', textAlign: 'center' }}>Signature de l'employeur</p>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center', minHeight: '40px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>(Cachet et signature)</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '30px', textAlign: 'center' }}>Signature du salarié</p>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center', minHeight: '40px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>(Signature précédée de la mention « Lu et approuvé »)</span>
                  </div>
                </div>
              </div>
              <p style={{ marginTop: '20px', fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                Document généré par le système MCE
              </p>
            </div>
          </div>

          <style>{`
            @media print {
              body * { visibility: hidden; }
              #contrat-print, #contrat-print * { visibility: visible; }
              #contrat-print {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 20mm !important;
                background: white !important;
                box-shadow: none !important;
                border-radius: 0 !important;
              }
              .no-print { display: none !important; }
              .print-only { display: block !important; }
              textarea { display: none !important; }
              #contrat-print h1 { font-size: 20px !important; }
              #contrat-print h2 { font-size: 18px !important; }
              #contrat-print h3 { font-size: 16px !important; }
              #contrat-print p, #contrat-print div { font-size: 12px !important; }
            }
            .print-only { display: none; }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default GenerationContrat;