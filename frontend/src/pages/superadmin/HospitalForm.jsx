import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../axios';

const API_BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:5000';

const HospitalForm = () => {
  const [form, setForm] = useState({
    nom: '', slug: '', emailAdmin: '', password: '',
    telephone: '', adresse: '', pays: 'RDC',
    logo_url: '', couleur: '#0ea5e9',
  });
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const navigate = useNavigate();

  // 📌 Normalise le slug en minuscules à la saisie (cohérent avec le backend)
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === 'slug' ? value.toLowerCase().replace(/[^a-z0-9-]/g, '') : value,
    }));
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post('/hospitals/upload-logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((f) => ({ ...f, logo_url: res.data.logo_url }));
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Erreur d'upload");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/hospitals/register', form);
      setCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ✅ Écran de succès — affiche login admin + URL
  // ============================================================
  if (created) {
    const adminLogin = created.adminLogin || created.admin_login;
    const loginUrl   = created.loginUrl   || created.login_url;

    return (
      <div style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
        <h1 style={{ color: '#166534' }}>✅ Hôpital créé</h1>

        {created.hospital?.logo_url && (
          <img
            src={`${API_BASE}${created.hospital.logo_url}`}
            alt="Logo"
            style={{
              height: '80px', marginTop: '1rem', borderRadius: '8px',
              border: '1px solid #e2e8f0', objectFit: 'contain',
              backgroundColor: '#f8fafc', padding: '4px',
            }}
          />
        )}

        {/* 📌 Bloc de connexion à communiquer au client */}
        <div style={{
          marginTop: '1.25rem', padding: '16px',
          background: '#ecfdf5', borderRadius: '10px',
          border: '1px solid #a7f3d0',
        }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#065f46' }}>
            🔑 Identifiants de l'admin
          </p>
          <p style={{ margin: '8px 0 4px', fontSize: 14, color: '#047857' }}>
            Login :{' '}
            <code style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}>
              {adminLogin || '—'}
            </code>
          </p>
          <p style={{ margin: '0 0 4px', fontSize: 14, color: '#047857' }}>
            Mot de passe : <em>celui saisi dans le formulaire</em>
          </p>
          {loginUrl && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#047857' }}>
              URL de connexion :{' '}
              <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>
                {loginUrl}
              </code>
            </p>
          )}
        </div>

        {/* JSON brut en debug repliable */}
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: '#64748b' }}>
            Détails techniques
          </summary>
          <pre style={{
            backgroundColor: '#f1f5f9', padding: '1rem',
            borderRadius: '8px', overflowX: 'auto', fontSize: 12,
          }}>
            {JSON.stringify(created, null, 2)}
          </pre>
        </details>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => navigate('/superadmin/hospitals')}
            style={{
              padding: '10px 18px', backgroundColor: '#234A81', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
            }}
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // 📝 Formulaire
  // ============================================================
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: '#1e3a8a' }}>Nouvel hôpital</h1>
      {error && (
        <div style={{
          padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c',
          borderRadius: '8px', marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        style={{
          backgroundColor: 'white', padding: '2rem',
          borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        }}
      >
        {[
          ['nom', "Nom de l'hôpital *"],
          ['slug', 'Slug (a-z 0-9 -) *'],
          ['emailAdmin', 'Email admin *'],
          ['password', 'Mot de passe admin *'],
          ['telephone', 'Téléphone'],
          ['adresse', 'Adresse'],
          ['pays', 'Pays'],
          ['couleur', 'Couleur (#hex)'],
        ].map(([name, label]) => (
          <div key={name} style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
              {label}
            </label>
            <input
              type={name === 'password' ? 'password' : 'text'}
              name={name}
              value={form[name]}
              onChange={onChange}
              required={['nom', 'slug', 'emailAdmin', 'password'].includes(name)}
              style={{
                width: '100%', padding: '10px',
                border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px',
              }}
            />

            {/* 📌 Aperçu du login admin — juste après le champ slug */}
            {name === 'slug' && (
              <div style={{
                marginTop: '8px', padding: '12px',
                background: '#eff6ff', borderRadius: '8px',
                border: '1px solid #bfdbfe',
              }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', fontWeight: 500 }}>
                  🔑 Login de l'admin :{' '}
                  <code style={{ background: 'white', padding: '2px 6px', borderRadius: 4 }}>
                    admin@{form.slug || 'slug'}
                  </code>
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                  L'admin se connectera avec ce login et le mot de passe saisi ci-dessus.
                </p>
              </div>
            )}
          </div>
        ))}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
            Logo de l'hôpital
          </label>
          <input type="file" accept="image/*" onChange={onFileChange} />
          {uploading && (
            <p style={{ color: '#64748b', fontSize: '13px' }}>Upload en cours…</p>
          )}
          {(preview || form.logo_url) && (
            <div style={{ marginTop: '0.5rem' }}>
              <img
                src={preview || `${API_BASE}${form.logo_url}`}
                alt="Aperçu logo"
                style={{
                  height: '80px', borderRadius: '8px', border: '1px solid #e2e8f0',
                  objectFit: 'contain', backgroundColor: '#f8fafc', padding: '4px',
                }}
              />
              {form.logo_url && (
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  URL : <code>{form.logo_url}</code>
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || uploading}
          style={{
            width: '100%', padding: '12px', backgroundColor: '#234A81',
            color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700',
            cursor: (loading || uploading) ? 'not-allowed' : 'pointer',
            opacity: (loading || uploading) ? 0.6 : 1,
          }}
        >
          {loading ? 'Création…' : "Créer l'hôpital"}
        </button>
      </form>
    </div>
  );
};

export default HospitalForm;