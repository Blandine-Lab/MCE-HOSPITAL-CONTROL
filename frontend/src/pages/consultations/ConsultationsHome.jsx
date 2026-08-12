import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const ConsultationsHome = () => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const bgImage = '/CONSULTATION.jpg';
  const clickIcon = '/CLICK.jpg';

  useEffect(() => {
    setLoaded(true);
  }, []);

  const cardStyle = {
    display: 'block',
    backgroundImage: `url(${bgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#1e3a8a',
    borderRadius: '16px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1)',
    textDecoration: 'none',
    height: '280px',
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(30px)',
  };

  const overlayStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    transition: 'backgroundColor 0.3s',
  };

  const iconStyle = {
    width: '64px',
    height: 'auto',
    marginBottom: '16px',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
    transition: 'transform 0.2s',
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '8px',
  };

  const descStyle = {
    color: '#e2e8f0',
    fontSize: '14px',
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.transform = 'scale(1.02) translateY(-5px)';
    e.currentTarget.style.boxShadow = '0 25px 30px -12px rgba(0,0,0,0.3)';
    const overlay = e.currentTarget.querySelector('.overlay');
    if (overlay) overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.45)';
    const img = e.currentTarget.querySelector('.card-icon');
    if (img) img.style.transform = 'scale(1.1)';
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = 'scale(1) translateY(0)';
    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
    const overlay = e.currentTarget.querySelector('.overlay');
    if (overlay) overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.65)';
    const img = e.currentTarget.querySelector('.card-icon');
    if (img) img.style.transform = 'scale(1)';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            color: '#1e3a8a',
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'all 0.5s',
            margin: 0
          }}>
            Consultations & Admissions
          </h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          {/* Cartes existantes */}
          <Link to="/admission" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="overlay" style={overlayStyle}>
              <img src={clickIcon} alt="Click" className="card-icon" style={iconStyle} />
              <h2 style={titleStyle}>Admission / Hospitalisation</h2>
              <p style={descStyle}>Admettre un patient, crer un sjour, occuper un lit</p>
            </div>
          </Link>

          <Link to="/urgences" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="overlay" style={overlayStyle}>
              <img src={clickIcon} alt="Click" className="card-icon" style={iconStyle} />
              <h2 style={titleStyle}>Urgences</h2>
              <p style={descStyle}>Triage, priorit, prise en charge rapide</p>
            </div>
          </Link>

          <Link to="/rendezvous" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="overlay" style={overlayStyle}>
              <img src={clickIcon} alt="Click" className="card-icon" style={iconStyle} />
              <h2 style={titleStyle}>Rendez?FC?vous</h2>
              <p style={descStyle}>Planification et rappels SMS/Email</p>
            </div>
          </Link>

          <Link to="/lits" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="overlay" style={overlayStyle}>
              <img src={clickIcon} alt="Click" className="card-icon" style={iconStyle} />
              <h2 style={titleStyle}>Gestion des lits</h2>
              <p style={descStyle}>Visualisation des chambres et lits (occups/libres)</p>
            </div>
          </Link>

          <Link to="/transfert" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="overlay" style={overlayStyle}>
              <img src={clickIcon} alt="Click" className="card-icon" style={iconStyle} />
              <h2 style={titleStyle}>Transfert de patient</h2>
              <p style={descStyle}>Changer de lit ou de service</p>
            </div>
          </Link>

          <Link to="/sortie" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="overlay" style={overlayStyle}>
              <img src={clickIcon} alt="Click" className="card-icon" style={iconStyle} />
              <h2 style={titleStyle}>Sortie de patient</h2>
              <p style={descStyle}>Librer le lit, enregistrer la sortie</p>
            </div>
          </Link>

          {/* Prescriptions et ordonnances */}
          <Link 
            to="/doctor/prescriptions" 
            style={cardStyle} 
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
          >
            <div className="overlay" style={{ ...overlayStyle, backgroundColor: 'rgba(22, 163, 74, 0.75)' }}>
              <img src={clickIcon} alt="Click" className="card-icon" style={iconStyle} />
              <h2 style={titleStyle}>?? Prescriptions</h2>
              <p style={descStyle}>Crer et suivre vos prescriptions mdicales</p>
            </div>
          </Link>

          <Link 
            to="/pharmacist/prescriptions" 
            style={cardStyle} 
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
          >
            <div className="overlay" style={{ ...overlayStyle, backgroundColor: 'rgba(37, 99, 235, 0.75)' }}>
              <img src={clickIcon} alt="Click" className="card-icon" style={iconStyle} />
              <h2 style={titleStyle}>?? Ordonnances</h2>
              <p style={descStyle}>Consulter et servir les ordonnances en attente</p>
            </div>
          </Link>

          {/* Patients */}
          <Link to="/patients" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="overlay" style={{ ...overlayStyle, backgroundColor: 'rgba(124, 58, 237, 0.7)' }}>
              <img src={clickIcon} alt="Click" className="card-icon" style={iconStyle} />
              <h2 style={titleStyle}>?? Patients</h2>
              <p style={descStyle}>Voir la liste des patients et accder  leurs dossiers</p>
            </div>
          </Link>

          {/* ========== NOUVEAU : BLOC OPRATOIRE ========== */}
          <Link to="/bloc" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="overlay" style={{ ...overlayStyle, backgroundColor: 'rgba(220, 38, 38, 0.75)' }}>
              <img src={clickIcon} alt="Click" className="card-icon" style={iconStyle} />
              <h2 style={titleStyle}>?? Bloc Opratoire</h2>
              <p style={descStyle}>Planifier les interventions, grer les salles et les quipes chirurgicales</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ConsultationsHome;
