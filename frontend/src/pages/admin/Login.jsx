import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../axios';

const Login = () => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        login: login.trim(),
        password: password.trim()
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      // ? Redirection vers la page d'accueil (Home)
      navigate('/');
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Erreur de connexion';
      setError(message);
      console.error('Erreur login :', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Vido en arrire?FC?plan */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          minWidth: '100%',
          minHeight: '100%',
          width: 'auto',
          height: 'auto',
          transform: 'translate(-50%, -50%)',
          objectFit: 'cover',
          zIndex: 0,
        }}
      >
        <source src="/Loginvideo.mp4" type="video/mp4" />
        Votre navigateur ne supporte pas la vido.
      </video>

      {/* Logo anim par-dessus la vido */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 3,
          animation: 'floating 3s ease-in-out infinite',
        }}
      >
        <img
          src="/logo.jpeg"
          alt="Logo MCE"
          style={{
            width: '100px',
            height: 'auto',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Contenu du formulaire (centr) */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '400px',
            width: '100%',
            padding: '32px',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}
        >
          <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#1e3a8a' }}>
            Connexion
          </h2>
          {error && (
            <div
              style={{
                color: '#b91c1c',
                backgroundColor: '#fee2e2',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Login</label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>

      {/* Style pour l'animation du logo */}
      <style>{`
        @keyframes floating {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
