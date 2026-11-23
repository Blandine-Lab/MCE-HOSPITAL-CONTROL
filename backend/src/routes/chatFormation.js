// ============================================================
// CHAT DE FORMATION — public, identification par nom
// Fichier ISOLÉ : n'importe rien de chat.js, ne le modifie pas.
// ============================================================
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../services/supabase');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';

const ACCESS_CODE = process.env.FORMATION_ACCESS_CODE || null;

function normalizeFormateurName(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const has = (t) => s.includes(t);
  if (has('nathan') && has('nkulu')) return 'Nathan Nkulu';
  if (has('dorca') && has('lama')) return 'Dorca Lama';
  return null;
}

const SYSTEM_PROMPT = `Tu es "Formateur MCE", un assistant de formation dédié EXCLUSIVEMENT à la plateforme hospitalière MCE.

TU FORMES UNIQUEMENT DEUX PERSONNES :
- Nathan Nkulu
- Dorca Lama

Si l'utilisateur prétend être quelqu'un d'autre, refuse poliment et arrête.

═══ ORDRE DES MODULES ═══
1. Patient (Dossier Patient Unique - DPI)
2. Consultations & Admissions
3. Médical (DME)
4. Paramédical & Soins
5. Facturation & Tiers Payant
6. Laboratoire & Imagerie
7. Pharmacie
8. Ressources Humaines & Planning
9. Finances & Comptabilité
10. Stock & Approvisionnement
11. Gestion de la Qualité & Risques
12. Reporting & Décisionnel (BI)
13. Sécurité & Conformité
14. Interopérabilité
15. Interface Utilisateur (UI/UX)

═══ RÈGLES PÉDAGOGIQUES ═══
- Si l'utilisateur dit "étudions le premier module" → commence par le module 1 (Patient DPI).
- Avance UNE fonctionnalité à la fois. Attends la réponse avant de continuer.
- Après chaque explication, pose UNE question de vérification.
- Si la réponse est correcte → valide et passe à la suite. Sinon → réexplique autrement.
- Quand un module est terminé, annonce-le et propose de passer au suivant.
- Ne saute JAMAIS un module sans demande explicite.
- Si l'utilisateur nomme un module précis, tu peux y aller directement.

═══ STYLE ═══
- Français, ton pédagogique, exemples concrets d'hôpital congolais.
- Messages concis : 3 à 8 phrases max.
- Étapes numérotées pour les procédures.`;

// 🔥 PATCH IDENTITÉ — injecte le nom vérifié dans le prompt
function buildPersonalizedPrompt(canonicalName) {
  return `${SYSTEM_PROMPT}

═══ IDENTITÉ DE L'UTILISATEUR ACTUEL ═══
Tu parles MAINTENANT à : ${canonicalName}
Cette identité a été VÉRIFIÉE par le système (nom + code d'accès).
Ne demande JAMAIS à cette personne de se re-identifier.
Ne lui demande PAS si elle est Nathan ou Dorca — c'est confirmé.
Commence directement à la former sur le module demandé.`;
}

async function callGroq(messages) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY manquant');
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 600,
    }),
  });
  const data = await res.json();
  if (!data.choices?.[0]?.message?.content) {
    console.error('❌ Groq formation :', JSON.stringify(data).slice(0, 300));
    throw new Error('Réponse IA invalide');
  }
  return data.choices[0].message.content.trim();
}

router.post('/message', async (req, res) => {
  try {
    const { formateurName, message, accessCode } = req.body;

    if (ACCESS_CODE && accessCode !== ACCESS_CODE) {
      return res.status(403).json({ error: 'Code d\'accès invalide.' });
    }

    const canonicalName = normalizeFormateurName(formateurName);
    if (!canonicalName) {
      return res.status(403).json({
        error: 'Ce chat est réservé à Nathan Nkulu et Dorca Lama.',
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message requis' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message trop long' });
    }

    const { data: existing } = await supabaseAdmin
      .from('formation_threads')
      .select('id, messages')
      .eq('formateur_name', canonicalName)
      .eq('module', 'dpi')
      .maybeSingle();

    let threadId = existing?.id;
    let history = existing?.messages || [];

    if (!threadId) {
      const { data: created, error: cErr } = await supabaseAdmin
        .from('formation_threads')
        .insert({ formateur_name: canonicalName, module: 'dpi', messages: [] })
        .select('id')
        .single();
      if (cErr) throw new Error(cErr.message);
      threadId = created.id;
      history = [];
    }

    // 🔥 PATCH IDENTITÉ — utilise le prompt personnalisé
    const messages = [
      { role: 'system', content: buildPersonalizedPrompt(canonicalName) },
      ...history,
      { role: 'user', content: message.trim() },
    ];

    const reply = await callGroq(messages);

    const newHistory = [
      ...history,
      { role: 'user', content: message.trim() },
      { role: 'assistant', content: reply },
    ].slice(-60);

    await supabaseAdmin
      .from('formation_threads')
      .update({ messages: newHistory, updated_at: new Date().toISOString() })
      .eq('id', threadId);

    res.json({ reply, threadId, formateurName: canonicalName });
  } catch (err) {
    console.error('❌ chatFormation /message :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const canonicalName = normalizeFormateurName(req.query.formateurName);
    if (!canonicalName) {
      return res.status(403).json({ error: 'Nom invalide.' });
    }

    const { data } = await supabaseAdmin
      .from('formation_threads')
      .select('messages')
      .eq('formateur_name', canonicalName)
      .eq('module', 'dpi')
      .maybeSingle();

    res.json({ messages: data?.messages || [], formateurName: canonicalName });
  } catch (err) {
    console.error('❌ chatFormation /history :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset', async (req, res) => {
  try {
    const { formateurName, accessCode } = req.body;
    if (ACCESS_CODE && accessCode !== ACCESS_CODE) {
      return res.status(403).json({ error: 'Code d\'accès invalide.' });
    }
    const canonicalName = normalizeFormateurName(formateurName);
    if (!canonicalName) return res.status(403).json({ error: 'Nom invalide.' });

    await supabaseAdmin
      .from('formation_threads')
      .update({ messages: [], updated_at: new Date().toISOString() })
      .eq('formateur_name', canonicalName)
      .eq('module', 'dpi');

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ chatFormation /reset :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;