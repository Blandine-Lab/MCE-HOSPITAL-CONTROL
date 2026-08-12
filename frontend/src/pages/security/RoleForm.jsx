import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const RoleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState({ nom: '', description: '', permission_ids: [] });
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Charger les permissions et le rôle si édition
  useEffect(() => {
    const fetchData = async () => {
      try {
        const permsRes = await api.get('/security/permissions');
        setPermissions(permsRes.data);

        if (isEdit) {
          const roleRes = await api.get(`/security/roles/${id}`);
          const role = roleRes.data;
          setFormData({
            nom: role.nom || '',
            description: role.description || '',
            permission_ids: role.permissions?.map(p => p.id) || [],
          });
        }
      } catch (err) {
        console.error('Erreur chargement:', err);
        setError('Impossible de charger les données');
      }
    };
    fetchData();
  }, [id, isEdit]);

  // Gérer les changements de champs texte
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Gérer la sélection/désélection d'une permission
  const togglePermission = (permId) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter(id => id !== permId)
        : [...prev.permission_ids, permId]
    }));
  };

  // Sélectionner / désélectionner toutes les permissions d'un module
  const toggleModule = (moduleName) => {
    const modulePerms = permissions.filter(p => p.module === moduleName);
    const allIds = modulePerms.map(p => p.id);
    const allSelected = allIds.every(id => formData.permission_ids.includes(id));
    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        permission_ids: prev.permission_ids.filter(id => !allIds.includes(id))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permission_ids: [...new Set([...prev.permission_ids, ...allIds])]
      }));
    }
  };

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        nom: formData.nom,
        description: formData.description,
        permission_ids: formData.permission_ids,
      };
      if (isEdit) {
        await api.put(`/security/roles/${id}`, payload);
      } else {
        await api.post('/security/roles', payload);
      }
      navigate('/security/roles');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  // Regrouper les permissions par module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const module = perm.module || 'Autres';
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {});

  return (
    <div>
      <Link to="/security/roles" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}>
        <FaArrowLeft /> Retour
      </Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>{isEdit ? 'Modifier' : 'Nouveau'} rôle</h2>
        {error && <div style={{ color: 'red', marginBottom: '12px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label>Nom *</label>
              <input
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label>Description</label>
              <input
                name="description"
                value={formData.description}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <label style={{ fontWeight: 'bold' }}>Permissions</label>
            {Object.keys(groupedPermissions).length === 0 ? (
              <p style={{ color: '#94a3b8', marginTop: '8px' }}>
                Aucune permission disponible. Contactez l'administrateur.
              </p>
            ) : (
              Object.entries(groupedPermissions).map(([module, perms]) => {
                const allIds = perms.map(p => p.id);
                const allSelected = allIds.every(id => formData.permission_ids.includes(id));
                return (
                  <div key={module} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleModule(module)}
                        style={{ marginRight: '8px' }}
                      />
                      <strong style={{ fontSize: '16px' }}>{module}</strong>
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8' }}>
                        ({perms.length} permission{perms.length > 1 ? 's' : ''})
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px', paddingLeft: '24px' }}>
                      {perms.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.permission_ids.includes(p.id)}
                            onChange={() => togglePermission(p.id)}
                          />
                          {p.nom || p.code}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '24px',
              backgroundColor: '#f59e0b',
              color: 'white',
              padding: '12px 32px',
              border: 'none',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoleForm;
