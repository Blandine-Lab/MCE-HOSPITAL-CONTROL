// frontend/src/components/ChatWidget.jsx
import { useEffect, useRef, useState } from 'react';
import { FaCommentDots, FaTimes, FaPaperPlane } from 'react-icons/fa';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const pollRef = useRef(null);

  // 💾 sessionId persistant
  useEffect(() => {
    let sid = localStorage.getItem('chatSessionId');
    if (!sid) {
      sid = (crypto.randomUUID && crypto.randomUUID()) || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('chatSessionId', sid);
    }
    setSessionId(sid);
  }, []);

  // 🔄 polling quand ouvert
  useEffect(() => {
    if (!isOpen || !sessionId) return;
    loadMessages();
    setUnread(0);
    pollRef.current = setInterval(loadMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [isOpen, sessionId]);

  // 🔔 badge non-lus quand fermé (compte IA + admin)
  useEffect(() => {
    if (isOpen || !sessionId) return;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/chat/messages/${sessionId}`);
        const data = await r.json();
        const botMsgs = (data.messages || []).filter(
          (m) => m.sender === 'admin' || m.sender === 'ai'
        );
        setUnread(Math.max(0, botMsgs.length - lastSeenCount));
      } catch {}
    }, 15000);
    return () => clearInterval(id);
  }, [isOpen, sessionId, lastSeenCount]);

  // scroll auto
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const loadMessages = async () => {
    try {
      const r = await fetch(`/api/chat/messages/${sessionId}`);
      const data = await r.json();
      const msgs = data.messages || [];
      setMessages(msgs);
      setLastSeenCount(
        msgs.filter((m) => m.sender === 'admin' || m.sender === 'ai').length
      );
    } catch (e) {
      console.error('chat poll :', e);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || sending || !sessionId) return;
    setSending(true);
    setError('');
    const content = input.trim();
    setInput('');

    // optimiste
    const optimistic = {
      id: `tmp_${Date.now()}`,
      sender: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const user = (() => {
        try { return JSON.parse(localStorage.getItem('user') || 'null'); }
        catch { return null; }
      })();
      const r = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, content, user }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erreur envoi');
      await loadMessages();
    } catch (e) {
      setError(e.message);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  // 🎨 Sélecteur de style selon l'expéditeur
  const bubbleStyle = (sender) => {
    if (sender === 'user') return S.bubbleUser;
    if (sender === 'ai') return S.bubbleAI;
    return S.bubbleAdmin;
  };

  const senderLabel = (sender) => {
    if (sender === 'user') return 'Vous';
    if (sender === 'ai') return '🤖 Assistant';
    return 'Support';
  };

  return (
    <>
      {/* 🪟 Panneau de chat */}
      {isOpen && (
        <div style={S.panel}>
          <div style={S.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={S.dot} />
              <span style={{ fontWeight: 700 }}>Chat avec nous en direct</span>
            </div>
            <button onClick={() => setIsOpen(false)} style={S.closeBtn} aria-label="Fermer">
              <FaTimes size={14} />
            </button>
          </div>

          <div style={S.messages}>
            {messages.length === 0 && (
              <div style={S.empty}>
                👋 Bonjour !<br />
                Posez-nous votre question, l'assistant IA vous répond en direct.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} style={bubbleStyle(m.sender)}>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 3 }}>
                  {senderLabel(m.sender)} ·{' '}
                  {new Date(m.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {error && <div style={S.error}>{error}</div>}

          <form onSubmit={handleSend} style={S.inputBar}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez votre message…"
              disabled={sending}
              maxLength={2000}
              style={S.input}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              style={S.sendBtn}
              aria-label="Envoyer"
            >
              <FaPaperPlane size={14} />
            </button>
          </form>
        </div>
      )}

      {/* 🟢 Bouton flottant */}
      <button
        onClick={() => { setIsOpen(true); setUnread(0); }}
        style={{ ...S.fab, display: isOpen ? 'none' : 'flex' }}
        aria-label="Ouvrir le chat"
      >
        <FaCommentDots size={22} />
        {unread > 0 && <span style={S.badge}>{unread > 9 ? '9+' : unread}</span>}
        <span style={S.fabLabel}>Chat avec nous en direct</span>
      </button>
    </>
  );
};

const S = {
  fab: {
    position: 'fixed', bottom: 24, right: 24, zIndex: 2500,
    background: '#16a34a', color: 'white', border: 'none',
    padding: '14px 20px', borderRadius: 999, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 10,
    boxShadow: '0 8px 24px rgba(22,163,74,0.4)',
    fontSize: 14, fontWeight: 600,
    animation: 'pulseChat 2.4s infinite',
  },
  fabLabel: { display: 'inline' },
  badge: {
    position: 'absolute', top: -6, right: -6,
    background: '#ef4444', color: 'white',
    borderRadius: '50%', minWidth: 22, height: 22,
    fontSize: 11, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 6px',
  },
  panel: {
    position: 'fixed', bottom: 24, right: 24, zIndex: 2500,
    width: 380, height: 540,
    maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 100px)',
    background: 'white', borderRadius: 16,
    boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    border: '1px solid #e2e8f0',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    background: '#0f172a', color: 'white',
    padding: '14px 16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 14,
  },
  dot: {
    width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
    boxShadow: '0 0 0 3px rgba(34,197,94,0.3)',
  },
  closeBtn: {
    background: 'none', border: 'none', color: 'white', cursor: 'pointer',
    padding: 4, display: 'flex', alignItems: 'center',
  },
  messages: {
    flex: 1, overflowY: 'auto', padding: 14,
    background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10,
  },
  empty: { textAlign: 'center', color: '#64748b', padding: 30, fontSize: 14 },
  bubbleUser: {
    alignSelf: 'flex-end', maxWidth: '80%',
    background: '#0ea5e9', color: 'white',
    padding: '8px 12px', borderRadius: '14px 14px 2px 14px',
    fontSize: 13,
  },
  bubbleAI: {
    alignSelf: 'flex-start', maxWidth: '85%',
    background: '#f1f5f9', color: '#0f172a',
    padding: '8px 12px', borderRadius: '14px 14px 14px 2px',
    fontSize: 13, border: '1px solid #e2e8f0',
  },
  bubbleAdmin: {
    alignSelf: 'flex-start', maxWidth: '80%',
    background: 'white', color: '#0f172a',
    padding: '8px 12px', borderRadius: '14px 14px 14px 2px',
    fontSize: 13, border: '1px solid #e2e8f0',
  },
  inputBar: {
    display: 'flex', gap: 8, padding: 10,
    borderTop: '1px solid #e2e8f0', background: 'white',
  },
  input: {
    flex: 1, padding: '10px 12px', fontSize: 13,
    border: '1px solid #cbd5e1', borderRadius: 999, outline: 'none',
  },
  sendBtn: {
    background: '#16a34a', color: 'white', border: 'none',
    width: 40, height: 40, borderRadius: '50%',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  error: {
    background: '#fee2e2', color: '#b91c1c',
    fontSize: 12, padding: '8px 12px',
  },
};

export default ChatWidget;