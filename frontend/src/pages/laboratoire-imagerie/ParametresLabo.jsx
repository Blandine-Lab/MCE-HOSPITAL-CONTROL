import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaCog } from 'react-icons/fa';

const ParametresLabo = () => {
  return (
    <div>
      <Link to="/laboratoire" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', marginBottom: '24px' }}>
        <FaArrowLeft /> Retour
      </Link>
      <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2><FaCog /> Paramtres du laboratoire</h2>
        <p>Page en cours de dveloppement. Ici vous pourrez configurer les valeurs de rfrence, les units, etc.</p>
      </div>
    </div>
  );
};

export default ParametresLabo;
