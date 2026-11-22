import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: loginContext } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', {
        login: login.trim(),
        password, // 📌 pas de trim sur le mot de passe
      });
      const { token, user, hopital } = response.data;

      console.log('✅ LOGIN RESPONSE', {
        token: token ? token.slice(0, 20) + '…' : 'ABSENT',
        user: {
          id: user?.id,
          login: user?.login,
          role: user?.role,
          is_super_admin: user?.is_super_admin,
          hospital_slug: user?.hospital_slug,
        },
        hopital: hopital?.slug,
      });

      // 🔑 Persister user + token AVANT loginContext
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      loginContext(token, user, hopital);

      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }

      // 👑 Détection robuste du super admin (role OU is_super_admin)
      const isSuperAdmin =
        user?.is_super_admin === true || user?.role === 'super_admin';

      console.log('🧭 REDIRECT →', isSuperAdmin ? '/super-admin' : '/');

      if (isSuperAdmin) {
        navigate('/super-admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Erreur de connexion';
      setError(message);
      console.error('❌ Erreur login :', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ============ GAUCHE ============ */}
      <div className="login-left">
        <img src="/hopital.jpg" alt="" className="hopital-bg" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <div className="blue-overlay" />
        <div className="flag-wave" />
        <div className="white-curve" />

        <div className="left-content">
          <div className="brand">
            <img src="/rdc-map.png" alt="RDC" className="rdc-map" />
            <div className="brand-text">
              <h1>e-Santé <span>RDC</span></h1>
              <p>Plateforme Intégrée de Gestion Hospitalière</p>
            </div>
          </div>

          <p className="left-subtitle">
            Un système unique pour tous les hôpitaux<br />
            de la République Démocratique du Congo
          </p>

          <div className="features">
            <div className="feature">
              <span className="feature-icon">
                <svg viewBox="0 0 64 64" fill="white"><path d="M32 3 6 13v6h52v-6L32 3zM12 25h40v28H38V40h-3V37H29v3h-3v13H12V25zm15 5h6v6h-6v-6zm12 0h6v6h-6v-6zm-12 12h6v6h-6v-6zm12 0h6v6h-6v-6zM28 9h8v4h4v8h-4v4h-8v-4h-4V13h4V9z"/></svg>
              </span>
              <div>Gérer vos<br />établissements</div>
            </div>
            <div className="feature">
              <span className="feature-icon">
                <svg viewBox="0 0 64 64" fill="white"><path d="M32 30c5 0 9-4 9-9s-4-9-9-9-9 4-9 9 4 9 9 9zm-16 8c4 0 7-3 7-7s-3-6-7-6-7 3-7 7 3 6 7 6zm32 0c4 0 7-3 7-7s-3-6-7-6-7 3-7 7 3 6 7 6zM32 35c-8 0-16 4-16 12v3h32v-3c0-8-8-12-16-12zM16 43c0-6 3-9 6-11-5 1-11 4-11 9v3h6v-1zm32 0v1h6v-3c0-5-6-8-11-9 3 2 5 5 5 11z"/></svg>
              </span>
              <div>Suivre vos patients</div>
            </div>
            <div className="feature">
              <span className="feature-icon">
                <svg viewBox="0 0 64 64" fill="white"><path d="M10 52V36h8v16h-8zm12 0V28h8v24h-8zm12 0V20h8v32h-8zm12 0V12h8v40h-8zM8 14 20 26l8-6 20-10-4 14-5-5-13 7-8 5L8 14z"/></svg>
              </span>
              <div>Optimiser vos<br />ressources</div>
            </div>
            <div className="feature">
              <span className="feature-icon">
                <svg viewBox="0 0 64 64" fill="white"><path d="M62 22c-2-3-6-4-9-2l-8 5-4-3c-1-1-3-1-4 0l-6 5-8-5c-2-1-5-1-7 1-3 2-4 5-3 7l-9 5c-2 1-3 4-2 6l4 7c1 2 4 3 6 2l18-9 6 3 12-7c3-2 5-6 4-9-1-3-2-5-3-7l6-4c3-2 4-5 2-8zm-25 14-6 3-18 9-3-5 18-9 6-3 3-2 5-4 4 3-9 6c-1 1 0 2 1 3l2 2c1 1 2 0 3-1l9-6 2 1c1 1 1 3 0 4l-11 7-5-4c-1-1-2 0-3 1s0 2 1 3l5 4c1 1 2 0 3-1l10-6c1 1 0 2 0 3l-10 6c-1 1 0 2 1 3l2 2c1 1 2 0 3-1l7-4c1 2 0 4-2 5l-12 7-5-3 5-3c1-1 0-2-1-3l-2-2c-1-1-2 0-3 1l-5 3-6-3 5-3c1-1 0-2-1-3l-2-2c-1-1-2 0-3 1l-5 3-3-4 9-5 8 5 6-5 4 3 8-5c1-1 3 0 4 1z"/></svg>
              </span>
              <div>Améliorer la qualité<br />des soins</div>
            </div>
          </div>

          <div className="gm-footer-pro">
            <div className="gm-line" />
            <div className="gm-row">
              <img src="/globalmind-logo.png" alt="GLOBALMIND" className="gm-logo-pro" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div className="gm-text">
                <span className="gm-company">GLOBALMIND.MK.INNOTECH</span>
                <span className="gm-role">Conception, développement & maintenance de la plateforme e-Santé RDC</span>
              </div>
            </div>
            <div className="gm-contacts-pro">
              <a href="mailto:globalmindinnotech@gmail.com">globalmindinnotech@gmail.com</a>
              <span className="gm-dot">•</span>
              <a href="https://wa.me/243987170739" target="_blank" rel="noreferrer">+243 987 170 739</a>
              <span className="gm-dot">•</span>
              <a href="https://wa.me/393333119373" target="_blank" rel="noreferrer">+39 333 311 9373</a>
            </div>
          </div>
        </div>
      </div>

      {/* ============ DROITE - VIDÉO ============ */}
      <div className="login-right" style={{ background: '#234A81' }}>
        <video className="right-video" autoPlay muted loop playsInline preload="auto" poster="/hopital.jpg">
          <source src="/hopital-video.mp4" type="video/mp4" />
        </video>

        <div className="login-card">
          <img src="/rdc-map.png" alt="RDC" className="card-map" />
          <h2>Connexion</h2>
          <p className="card-subtitle">Accédez à votre espace de gestion hospitalière</p>
          {error && <div className="error-box">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="input-group" style={{ marginBottom: '16px' }}>
              <span className="input-icon">👤</span>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Nom d'utilisateur (ex : admin@mce)"
                aria-label="Nom d'utilisateur"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>

            <div className="input-group">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                aria-label="Mot de passe"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="eye-btn"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-login">
              {loading ? 'Connexion...' : '➔  Se connecter'}
            </button>
          </form>
          <p className="card-footer">🛡️ &nbsp; <b>e-Santé RDC</b> — Ensemble pour une santé de qualité en RDC</p>
          <p className="gm-mini">Une solution <b>GLOBALMIND.MK.INNOTECH</b></p>
        </div>
      </div>

      <style>{`
        *{box-sizing:border-box}
        .login-page{display:flex;min-height:100vh;font-family:Inter,system-ui,Arial,sans-serif;background:#eaf2ff;overflow:hidden}
        .login-left{flex:1.15;position:relative;display:flex;align-items:center;padding:48px 56px 20px;color:white;overflow:hidden;background:#234A81}
        .hopital-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
        .blue-overlay{position:absolute;inset:0;z-index:1;
          background:linear-gradient(180deg, rgba(35,74,129,0.72), rgba(35,74,129,0.65) 55%, rgba(35,74,129,0.75));
          clip-path: polygon(0 0, 100% 0, 100% 82%, 85% 78%, 65% 86%, 45% 80%, 25% 87%, 10% 80%, 0 84%);
        }
        .flag-wave{position:absolute;left:0;right:0;bottom:0;width:100%;height:135px;z-index:2;
          background:url('/rdc-flag-wave.png') center bottom/cover no-repeat;
          filter: saturate(1.4) brightness(1.08) contrast(1.1);
          clip-path: polygon(0 16%, 10% 12%, 25% 20%, 45% 12%, 65% 20%, 85% 12%, 100% 18%, 100% 100%, 0 100%);
        }
        .flag-wave::after{content:'';position:absolute;inset:0;
          background:linear-gradient(115deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.25) 100%);
        }
        .white-curve{position:absolute;top:0;right:0;bottom:0;width:38px;background:#eaf2ff;z-index:4;clip-path:ellipse(100% 55% at 100% 50%)}
        .left-content{position:relative;z-index:3;width:100%;max-width:520px;padding-bottom:90px}
        .brand{display:flex;gap:16px;align-items:center;border-left:3px solid white;padding-left:16px}
        .rdc-map{width:90px;height:auto;filter:drop-shadow(0 4px 8px rgba(0,0,0,.3))}
        .brand h1{font-size:44px;line-height:1;margin:0;font-weight:800}
        .brand h1 span{color:#facc15}
        .brand p{margin:6px 0 0;font-size:13px;opacity:.95}
        .left-subtitle{font-size:18px;line-height:1.5;margin:28px 0 28px}
        .features{display:flex;flex-direction:column;gap:20px}
        .feature{display:flex;gap:18px;align-items:center;font-size:17px;font-weight:500;line-height:1.3}
        .feature-icon{width:54px;height:54px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
        .feature-icon svg{width:54px;height:54px;fill:white;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.25))}
        .gm-footer-pro{margin-top:32px}
        .gm-line{height:1px;background:rgba(255,255,255,0.25);margin-bottom:14px}
        .gm-row{display:flex;gap:12px;align-items:center}
        .gm-logo-pro{height:38px;width:auto;object-fit:contain;background:white;border-radius:6px;padding:4px 8px;flex-shrink:0}
        .gm-text{display:flex;flex-direction:column;gap:2px}
        .gm-company{font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:white}
        .gm-role{font-size:11.5px;color:rgba(255,255,255,0.75);font-weight:400}
        .gm-contacts-pro{margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:12px}
        .gm-contacts-pro a{color:rgba(255,255,255,0.9);text-decoration:none}
        .gm-contacts-pro a:hover{text-decoration:underline;color:white}
        .gm-dot{color:rgba(255,255,255,0.5)}
        .gm-mini{margin:16px 0 0;padding-top:12px;border-top:1px solid #eef2f7;font-size:11px;color:#94a3b8;letter-spacing:0.4px;text-transform:uppercase}
        .gm-mini b{color:#234A81}
        .login-right{flex:1;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;background:#000;overflow:hidden}
        .right-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
        .login-card{position:relative;z-index:2;background:white;width:100%;max-width:440px;border-radius:18px;padding:28px 28px 20px;box-shadow:0 20px 50px rgba(0,0,0,.30);text-align:center}
        .card-map{width:90px;margin:0 auto}
        .login-card h2{font-size:32px;color:#234A81;margin:8px 0 4px}
        .card-subtitle{color:#64748b;font-size:14px;margin:0 0 20px}
        .error-box{color:#b91c1c;background:#fee2e2;padding:12px;border-radius:8px;margin-bottom:14px;font-size:14px}
        .input-group{position:relative;margin-bottom:14px}
        .input-group input{width:100%;padding:13px 42px 13px 44px;border:1px solid #dbe3ef;border-radius:10px;font-size:15px;outline:none;background:#fff;color:#1e293b}
        .input-group input:focus{border-color:#234A81;box-shadow:0 0 0 3px rgba(35,74,129,.15)}
        .input-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:17px}
        .eye-btn{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:17px}
        .btn-login{width:100%;padding:14px;background:#234A81;color:white;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer}
        .btn-login:hover{background:#1a365f}
        .btn-login:disabled{opacity:.6;cursor:not-allowed}
        .card-footer{margin-top:18px;font-size:12.5px;color:#475569}
        @media(max-width:900px){
          .login-page{flex-direction:column}
          .login-left{padding:28px 20px;min-height:580px}
          .brand h1{font-size:32px}
          .left-subtitle{font-size:15px}
          .features{gap:14px}
          .feature-icon,.feature-icon svg{width:42px;height:42px}
          .white-curve{display:none}
          .gm-logo-pro{height:32px}
        }
      `}</style>
    </div>
  );
};

export default Login;