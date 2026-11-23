import { useState } from 'react';
import axios from '../axios';

export default function FormationChat() {
  const [step, setStep] = useState('identify');
  const [formateurName, setFormateurName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const identifier = async () => {
    setError(null);
    if (!formateurName.trim()) {
      setError('Dis-nous qui tu es (Nathan Nkulu ou Dorca Lama).');
      return;
    }
    try {
      const { data } = await axios.get('/chat-formation/history', {
        params: { formateurName: formateurName.trim() },
      });
      setMessages(data.messages || []);
      setFormateurName(data.formateurName);
      setStep('chat');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const envoyer = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post('/chat-formation/message', {
        formateurName,
        accessCode: accessCode || undefined,
        message: userMsg,
      });
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setError(msg);
      setMessages((m) => [...m, { role: 'assistant', content: '❌ ' + msg }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('Recommencer la formation à zéro ?')) return;
    try {
      await axios.post('/chat-formation/reset', { formateurName, accessCode: accessCode || undefined });
      setMessages([]);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  if (step === 'identify') {
    return (
      <div style={{ maxWidth: 500, margin: '4rem auto', padding: 24, fontFamily: 'sans-serif' }}>
        <h1>🎓 Formation MCE</h1>
        <p style={{ color: '#555' }}>
          Cet espace est réservé à <strong>Nathan Nkulu</strong> et <strong>Dorca Lama</strong>.
        </p>
        <label style={{ display: 'block', marginTop: 24, marginBottom: 8, fontWeight: 'bold' }}>
          Ton nom complet
        </label>
        <input
          value={formateurName}
          onChange={(e) => setFormateurName(e.target.value)}
          placeholder="Ex : Nathan Nkulu"
          style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 16 }}
          onKeyDown={(e) => e.key === 'Enter' && identifier()}
        />
        <label style={{ display: 'block', marginTop: 16, marginBottom: 8, fontWeight: 'bold' }}>
          Code d'accès <span style={{ fontWeight: 'normal', color: '#888' }}>(si fourni)</span>
        </label>
        <input
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Code fourni par l'administrateur"
          style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 16 }}
          onKeyDown={(e) => e.key === 'Enter' && identifier()}
        />
        {error && <p style={{ color: '#dc2626', marginTop: 12 }}>{error}</p>}
        <button
          onClick={identifier}
          style={{ marginTop: 20, width: '100%', padding: 12, background: '#0ea5e9', color: 'white', border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer' }}
        >
          Commencer la formation
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: 16, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>🎓 Formation — {formateurName}</h2>
        <button onClick={reset} style={{ padding: '6px 12px', fontSize: 12 }}>
          Recommencer
        </button>
      </div>
      <div style={{
        border: '1px solid #ddd', borderRadius: 8, minHeight: 450, maxHeight: '60vh',
        overflowY: 'auto', padding: 16, marginBottom: 12, background: '#fafafa',
      }}>
        {messages.length === 0 && (
          <p style={{ color: '#888', textAlign: 'center', marginTop: 100 }}>
            Dis <em>"étudions le premier module"</em> pour commencer.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '12px 0', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <span style={{
              background: m.role === 'user' ? '#0ea5e9' : 'white',
              color: m.role === 'user' ? 'white' : '#111',
              padding: '10px 14px', borderRadius: 12, display: 'inline-block', maxWidth: '85%',
              whiteSpace: 'pre-wrap', textAlign: 'left',
              boxShadow: m.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              border: m.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
            }}>{m.content}</span>
          </div>
        ))}
        {loading && (
          <p style={{ color: '#888', fontStyle: 'italic', marginTop: 12 }}>
            Le formateur réfléchit…
          </p>
        )}
      </div>
      {error && <p style={{ color: '#dc2626', marginBottom: 8 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && envoyer()}
          placeholder="Écris ton message…"
          disabled={loading}
          style={{ flex: 1, padding: 12, border: '1px solid #ddd', borderRadius: 6, fontSize: 15 }}
        />
        <button
          onClick={envoyer}
          disabled={loading}
          style={{ padding: '12px 24px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}