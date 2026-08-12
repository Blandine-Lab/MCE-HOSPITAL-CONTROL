import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 70px)',
      backgroundColor: '#f8fafc',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}>
        <div style={{
          backgroundColor: '#fee2e2',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <FaExclamationTriangle style={{ fontSize: '40px', color: '#dc2626' }} />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>
          Accs non autoris
        </h1>
        <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
          Vous n?FC?avez pas les permissions ncessaires pour accder  cette page.
          <br />
          <span style={{ fontWeight: '500' }}>Veuillez contacter votre service IT de l?FC?hpital pour obtenir les droits d?FC?accs.</span>
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '10px 24px',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            <FaArrowLeft /> Retour
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#e2e8f0',
              color: '#0f172a',
              padding: '10px 24px',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#cbd5e1'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
          >
            ?? Accueil
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
