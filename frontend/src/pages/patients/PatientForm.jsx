import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../axios';

const PatientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    date_naissance: '',
    telephone: '',
    email: '',
    adresse: '',
    genre: '' // si votre table a cette colonne, sinon retirez-la
  });

  useEffect(() => {
    if (id) {
      api.get(`/patients/${id}`)
        .then(res => {
          const patient = res.data;
          if (patient.date_naissance) patient.date_naissance = patient.date_naissance.split('T')[0];
          setForm(patient);
        })
        .catch(err => console.error(err));
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (id) {
        await api.put(`/patients/${id}`, form);
      } else {
        await api.post('/patients', form);
      }
      navigate('/patients');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const inputStyle = {
    border: '2px solid black',
    borderRadius: '6px',
    padding: '8px 12px',
    width: '100%',
    fontSize: '16px',
    backgroundColor: 'white',
  };
  const labelStyle = {
    display: 'block',
    fontWeight: '500',
    marginBottom: '4px',
    color: '#1f2937',
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '24px' }}>{id ? 'Modifier' : 'Nouveau'} patient</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div><label style={labelStyle}>Nom *</label><input name="nom" value={form.nom ?? ''} onChange={handleChange} style={inputStyle} required /></div>
            <div><label style={labelStyle}>Prénom *</label><input name="prenom" value={form.prenom ?? ''} onChange={handleChange} style={inputStyle} required /></div>
            <div><label style={labelStyle}>Date de naissance</label><input type="date" name="date_naissance" value={form.date_naissance ?? ''} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Téléphone</label><input name="telephone" value={form.telephone ?? ''} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Email</label><input type="email" name="email" value={form.email ?? ''} onChange={handleChange} style={inputStyle} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Adresse</label><input name="adresse" value={form.adresse ?? ''} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Genre</label>
              <select name="genre" value={form.genre ?? ''} onChange={handleChange} style={inputStyle}>
                <option value="">Non précisé</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
            <button type="button" onClick={() => navigate('/patients')} style={{ border: '2px solid black', padding: '8px 16px', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>Annuler</button>
            <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientForm;