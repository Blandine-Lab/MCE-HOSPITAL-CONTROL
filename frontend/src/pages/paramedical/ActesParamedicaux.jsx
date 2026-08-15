// src/pages/paramedical/ActesParamedicaux.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaClipboardList, FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';

const ActesParamedicaux = () => {
  const [actes, setActes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingActe, setEditingActe] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    categorie: '',
    description: '',
    duree_estimee: '',
    prix: ''
  });

  useEffect(() => {
    api.get('/actes-paramedicaux')
      .then(res => {
        setActes(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement actes :', err);
        setLoading(false);
      });
  }, []);

  const filteredActes = actes.filter(a =>
    a.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.categorie?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingActe) {
        await api.put(`/actes-paramedicaux/${editingActe.id}`, formData);
        setActes(actes.map(a => a.id === editingActe.id ? { ...a, ...formData } : a));
      } else {
        const res = await api.post('/actes-paramedicaux', formData);
        setActes([...actes, res.data]);
      }
      resetForm();
    } catch (err) {
      console.error('Erreur sauvegarde :', err);
    }
  };

  const resetForm = () => {
    setFormData({ code: '', nom: '', categorie: '', description: '', duree_estimee: '', prix: '' });
    setEditingActe(null);
    setShowForm(false);
  };

  const handleEdit = (acte) => {
    setEditingActe(acte);
    setFormData(acte);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet acte ?')) return;
    try {
      await api.delete(`/actes-paramedicaux/${id}`);
      setActes(actes.filter(a => a.id !== id));
    } catch (err) {
      console.error('Erreur suppression :', err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>⏳ Chargement des actes...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaClipboardList style={{ color: '#34d399' }} /> Actes paramédicaux
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            backgroundColor: '#34d399',
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
          <FaPlus /> {showForm ? 'Fermer' : 'Nouvel acte'}
        </button>
      </div>

      {/* Barre de recherche */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '4px 12px' }}>
          <FaSearch style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Rechercher par code, nom ou catégorie..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '24px', 
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h3 style={{ marginTop: 0 }}>{editingActe ? 'Modifier l\'acte' : 'Nouvel acte paramédical'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Nom *</label>
              <input
                type="text"
                value={formData.nom}
                onChange={e => setFormData({ ...formData, nom: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Catégorie</label>
              <select
                value={formData.categorie}
                onChange={e => setFormData({ ...formData, categorie: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              >
                <option value="">Sélectionner</option>
                <option value="Soins infirmiers">Soins infirmiers</option>
                <option value="Kinésithérapie">Kinésithérapie</option>
                <option value="Ergothérapie">Ergothérapie</option>
                <option value="Orthophonie">Orthophonie</option>
                <option value="Psychologie">Psychologie</option>
                <option value="Rééducation">Rééducation</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Durée estimée (min)</label>
              <input
                type="number"
                value={formData.duree_estimee}
                onChange={e => setFormData({ ...formData, duree_estimee: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Prix (FCFA)</label>
              <input
                type="number"
                value={formData.prix}
                onChange={e => setFormData({ ...formData, prix: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows="2"
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: '#34d399',
                  color: 'white',
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {editingActe ? 'Modifier' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tableau */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Code</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Nom</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Catégorie</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Durée</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Prix</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredActes.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Aucun acte trouvé
                </td>
              </tr>
            ) : (
              filteredActes.map((a, index) => (
                <tr 
                  key={a.id} 
                  style={{ 
                    borderBottom: index === filteredActes.length - 1 ? 'none' : '1px solid #f1f5f9'
                  }}
                >
                  <td style={{ padding: '14px 20px', fontWeight: '500', color: '#0f172a' }}>{a.code}</td>
                  <td style={{ padding: '14px 20px', color: '#334155' }}>{a.nom}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{a.categorie || '-'}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{a.duree_estimee ? `${a.duree_estimee} min` : '-'}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{a.prix ? `${a.prix} FCFA` : '-'}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleEdit(a)}
                        style={{ 
                          color: '#f59e0b', 
                          background: 'none', 
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        title="Modifier"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        style={{ 
                          color: '#ef4444', 
                          background: 'none', 
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        title="Supprimer"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActesParamedicaux;