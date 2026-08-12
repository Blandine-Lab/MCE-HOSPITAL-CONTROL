// src/pages/medical/BedManagement.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaHospital, FaBed, FaPlus, FaEdit } from 'react-icons/fa';

const BedManagement = () => {
  const [beds, setBeds] = useState([]);
  const [chambres, setChambres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newBed, setNewBed] = useState({ chambre_id: '', numero: '', statut: 'disponible' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bedsRes, chambresRes] = await Promise.all([
        api.get('/consultations/lits/all'),
        api.get('/consultations/chambres/list')
      ]);
      setBeds(bedsRes.data);
      setChambres(chambresRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement lits/chambres :', err);
      setLoading(false);
    }
  };

  const handleAddBed = async (e) => {
    e.preventDefault();
    if (!newBed.chambre_id || !newBed.numero) {
      setFormError('Veuillez slectionner une chambre et saisir un numro de lit.');
      return;
    }
    setFormError('');
    try {
      const payload = {
        chambre_id: parseInt(newBed.chambre_id),
        numero: newBed.numero,
        statut: newBed.statut
      };
      await api.post('/consultations/lits', payload);
      setNewBed({ chambre_id: '', numero: '', statut: 'disponible' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error('Erreur ajout lit :', err);
      setFormError('Erreur lors de l\'ajout. Vrifiez les donnes.');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 20px' }}>? Chargement des lits...</div>;
  }

  const disponibles = beds.filter(b => b.statut === 'disponible' || b.disponible === true).length;
  const occupes = beds.filter(b => b.statut === 'occup' || b.disponible === false).length;

  return (
    <div>
      {/* En-tte */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaHospital style={{ color: '#3b82f6' }} /> Gestion des lits
        </h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setFormError('');
          }}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <FaPlus /> Ajouter un lit
        </button>
      </div>

      {/* Statistiques */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#64748b', margin: 0 }}>Total</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '4px 0 0 0', color: '#0f172a' }}>{beds.length}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#64748b', margin: 0 }}>?? Disponibles</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '4px 0 0 0', color: '#10b981' }}>{disponibles}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#64748b', margin: 0 }}>?? Occups</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '4px 0 0 0', color: '#ef4444' }}>{occupes}</p>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h3 style={{ marginTop: 0 }}>Ajouter un nouveau lit</h3>
          {formError && <div style={{ color: '#ef4444', marginBottom: '12px' }}>{formError}</div>}
          <form onSubmit={handleAddBed} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Chambre *</label>
              <select
                value={newBed.chambre_id}
                onChange={e => setNewBed({ ...newBed, chambre_id: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              >
                <option value="">Slectionner une chambre</option>
                {chambres.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nom} (Bt. {c.batiment_nom || '?'} - tage {c.etage_numero || '?'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Numro du lit *</label>
              <input
                type="text"
                placeholder="ex: A1, B2..."
                value={newBed.numero}
                onChange={e => setNewBed({ ...newBed, numero: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Statut</label>
              <select
                value={newBed.statut}
                onChange={e => setNewBed({ ...newBed, statut: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              >
                <option value="libre">Libre</option>
                <option value="occup">Occup</option>
              </select>
            </div>
            <button
              type="submit"
              style={{
                gridColumn: '1 / -1',
                backgroundColor: '#10b981',
                color: 'white',
                padding: '10px',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              <FaBed style={{ marginRight: '6px' }} /> Ajouter
            </button>
          </form>
        </div>
      )}

      {/* Liste des lits */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Numro</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Chambre</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Statut</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Patient</th>
            </tr>
          </thead>
          <tbody>
            {beds.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Aucun lit</td>
              </tr>
            ) : (
              beds.map((b, index) => (
                <tr key={b.id} style={{ borderBottom: index === beds.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '500' }}><FaBed style={{ marginRight: '8px', color: '#3b82f6' }} /> {b.numero}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{b.chambre_nom || '-'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: (b.statut === 'disponible' || b.disponible === true) ? '#d1fae5' : '#fee2e2',
                      color: (b.statut === 'disponible' || b.disponible === true) ? '#065f46' : '#991b1b'
                    }}>
                      {(b.statut === 'disponible' || b.disponible === true) ? '?? Disponible' : '?? Occup'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{b.patient_nom ? `${b.patient_prenom} ${b.patient_nom}` : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BedManagement;
