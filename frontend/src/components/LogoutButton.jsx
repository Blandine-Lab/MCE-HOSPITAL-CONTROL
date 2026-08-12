import { useNavigate } from 'react-router-dom';

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        backgroundColor: '#dc2626',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        fontWeight: 'bold',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
    >
      ?? Dconnexion
    </button>
  );
};

export default LogoutButton;
