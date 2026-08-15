// src/pages/paramedical/SoinForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const SoinForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    patient_id: '',
    type_soin: '',
    description: '',
    date_soin: new Date().toISOString().split('T')[0],
    heure_soin: '09:00',
    prestataire: '',
    statut: 'planifie',   // Valeur sans accent (correspond à la contrainte)
    notes: ''
  });
  const [patients, setPatients] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Charger la liste des patients
    api.get('/patients')
      .then(res => setPatients(res.data))
      .catch(err => console.error('Erreur chargement patients :', err));

    // Charger la liste des employés (paramédicaux)
    api.get('/employes')
      .then(res => {
        console.log('📋 Données employés brutes :', res.data);
        // Liste des rôles paramédicaux (à adapter selon votre base)
        const rolesParamedicaux = [
          'infirmier', 'kinésithérapeute', 'aide-soignant',
          'ergothérapeute', 'orthophoniste', 'psychologue',
          'manipulateur_radio', 'diététicien', 'infirmière'
        ];
        // Filtrer les employés dont le rôle correspond
        const filtered = res.data.filter(e => {
          const role = (e.role || e.poste || e.fonction || '').toLowerCase();
          return rolesParamedicaux.some(r => role.includes(r));
        });
        console.log('🩺 Employés paramédicaux filtrés :', filtered);
        // Si aucun filtre ne correspond, on affiche tous les employés pour ne pas bloquer
        setEmployes(filtered.length > 0 ? filtered : res.data);
      })
      .catch(err => console.error('❌ Erreur chargement employés :', err));

    // Si édition, charger les données du soin
    if (isEdit) {
      api.get(`/soins/${id}`)
        .then(res => {
          const data = res.data;
          setFormData({
            patient_id: data.patient_id || '',
            type_soin: data.type_soin || '',
            description: data.description || '',
            date_soin: data.date_soin ? data.date_soin.split('T')[0] : '',
            heure_soin: data.heure_soin || '09:00',
            prestataire: data.prestataire || '',
            statut: data.statut || 'planifie',
            notes: data.notes || ''
          });
        })
        .catch(err => {
          console.error('Erreur chargement soin :', err);
          setError('Impossible de charger le soin');
        });
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Vérification du statut avant envoi
    console.log('📤 Données envoyées :', formData);

    try {
      if (isEdit) {
        await api.put(`/soins/${id}`, formData);
      } else {
        await api.post('/soins', formData);
      }
      navigate('/paramedical/soins');
    } catch (err) {
      console.error('Erreur sauvegarde :', err);
      setError('Erreur lors de l\'enregistrement du soin');
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/paramedical/soins" style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: '#3b82f6', 
          textDecoration: 'none',
          fontWeight: '500'
        }}>
          <FaArrowLeft /> Retour à la liste
        </Link>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>
          {isEdit ? 'Modifier le soin' : 'Nouveau soin'}
        </h2>

        {error && (
          <div style={{ 
            color: '#ef4444', 
            padding: '12px', 
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Patient */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Patient *
              </label>
              <select
                name="patient_id"
                value={formData.patient_id}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="">Sélectionner un patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom} {p.prenom}
                  </option>
                ))}
              </select>
            </div>

            {/* Type de soin */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Type de soin *
              </label>
              <select
                name="type_soin"
                value={formData.type_soin}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="">Sélectionner un type</option>
                <option value="Pansement">Pansement</option>
                <option value="Injection">Injection</option>
                <option value="Perfusion">Perfusion</option>
                <option value="Rééducation">Rééducation</option>
                <option value="Kinésithérapie">Kinésithérapie</option>
                <option value="Ergothérapie">Ergothérapie</option>
                <option value="Orthophonie">Orthophonie</option>
                <option value="Psychologie">Psychologie</option>
                <option value="Soin infirmier">Soin infirmier</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Date *
              </label>
              <input
                type="date"
                name="date_soin"
                value={formData.date_soin}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Heure */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Heure
              </label>
              <input
                type="time"
                name="heure_soin"
                value={formData.heure_soin}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Prestataire - Liste déroulante */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Prestataire
              </label>
              <select
                name="prestataire"
                value={formData.prestataire}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="">-- Sélectionner un prestataire --</option>
                {employes.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.prenom} {emp.nom} ({emp.role || emp.poste || emp.fonction || 'Paramédical'})
                  </option>
                ))}
              </select>
              {employes.length === 0 && (
                <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                  ⚠️ Aucun employé paramédical trouvé. Vérifiez le module RH.
                </p>
              )}
            </div>

            {/* Statut - valeurs sans accent */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Statut
              </label>
              <select
                name="statut"
                value={formData.statut}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="planifie">📋 Planifié</option>
                <option value="en_cours">🔄 En cours</option>
                <option value="effectue">✅ Effectué</option>
                <option value="annule">❌ Annulé</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                resize: 'vertical'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '24px',
              backgroundColor: '#34d399',
              color: 'white',
              padding: '12px 32px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaSave /> {loading ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer le soin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SoinForm;