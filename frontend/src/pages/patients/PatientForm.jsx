import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../axios'; // ? Utilisation de l'instance partage

const PatientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    ipp: '',
    nom: '',
    prenom: '',
    date_naissance: '',
    telephone: '',
    email: '',
    adresse: '',
    personne_a_prevenir_nom1: '',
    personne_a_prevenir_tel1: '',
    personne_a_prevenir_adresse1: '',
    personne_a_prevenir_nom2: '',
    personne_a_prevenir_tel2: '',
    personne_a_prevenir_adresse2: '',
    antecedents: '',
    allergies: '',
    traitements: '',
    consentements: false,
    date_admission: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (id) {
      api.get(`/patients/${id}`) // ? Suppression de l'URL absolue
        .then(res => {
          const patient = res.data;
          if (patient.date_naissance) patient.date_naissance = patient.date_naissance.split('T')[0];
          if (patient.date_admission) patient.date_admission = patient.date_admission.split('T')[0];
          setForm(patient);
        })
        .catch(err => console.error(err));
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
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
      alert('Erreur lors de l?FC?enregistrement');
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
            <div><label style={labelStyle}>N IPP *</label><input name="ipp" value={form.ipp ?? ''} onChange={handleChange} style={inputStyle} required /></div>
            <div><label style={labelStyle}>Nom *</label><input name="nom" value={form.nom ?? ''} onChange={handleChange} style={inputStyle} required /></div>
            <div><label style={labelStyle}>Prnom *</label><input name="prenom" value={form.prenom ?? ''} onChange={handleChange} style={inputStyle} required /></div>
            <div><label style={labelStyle}>Date naissance</label><input type="date" name="date_naissance" value={form.date_naissance ?? ''} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Tlphone</label><input name="telephone" value={form.telephone ?? ''} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Email</label><input type="email" name="email" value={form.email ?? ''} onChange={handleChange} style={inputStyle} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Adresse</label><input name="adresse" value={form.adresse ?? ''} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Date d'admission</label><input type="date" name="date_admission" value={form.date_admission ?? ''} onChange={handleChange} style={inputStyle} /></div>
          </div>

          <div style={{ borderTop: '1px solid #ccc', paddingTop: '16px', marginTop: '8px' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '12px' }}>?? Personne  prvenir 1</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div><label style={labelStyle}>Nom complet</label><input name="personne_a_prevenir_nom1" value={form.personne_a_prevenir_nom1 ?? ''} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Tlphone</label><input name="personne_a_prevenir_tel1" value={form.personne_a_prevenir_tel1 ?? ''} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Adresse</label><input name="personne_a_prevenir_adresse1" value={form.personne_a_prevenir_adresse1 ?? ''} onChange={handleChange} style={inputStyle} /></div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #ccc', paddingTop: '16px', marginTop: '16px' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '12px' }}>?? Personne  prvenir 2</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div><label style={labelStyle}>Nom complet</label><input name="personne_a_prevenir_nom2" value={form.personne_a_prevenir_nom2 ?? ''} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Tlphone</label><input name="personne_a_prevenir_tel2" value={form.personne_a_prevenir_tel2 ?? ''} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Adresse</label><input name="personne_a_prevenir_adresse2" value={form.personne_a_prevenir_adresse2 ?? ''} onChange={handleChange} style={inputStyle} /></div>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div><label style={labelStyle}>Antcdents mdicaux</label><textarea name="antecedents" rows="3" value={form.antecedents ?? ''} onChange={handleChange} style={{ ...inputStyle, resize: 'vertical' }} /></div>
            <div><label style={labelStyle}>Allergies</label><textarea name="allergies" rows="2" value={form.allergies ?? ''} onChange={handleChange} style={{ ...inputStyle, resize: 'vertical' }} /></div>
            <div><label style={labelStyle}>Traitements en cours</label><textarea name="traitements" rows="2" value={form.traitements ?? ''} onChange={handleChange} style={{ ...inputStyle, resize: 'vertical' }} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <input type="checkbox" name="consentements" checked={form.consentements || false} onChange={handleChange} style={{ width: '18px', height: '18px', border: '2px solid black' }} />
              <span>Consentement sign</span>
            </label>
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
