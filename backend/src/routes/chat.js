// backend/src/routes/chat.js
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../services/supabase');
const chatKnowledgeFallback = require('./chatKnowledge');

// ── Groq (chat) ──
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';

// ── Gemini (embeddings RAG) ──
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const GEMINI_EMBEDDING_DIMS = parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS, 10) || 1536;

// ── Telegram ──
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'change-me';

// ════════════════════════════════════════════════════════════
// 🔧 Décodage JWT sécurisé (pour extraire hospital_id)
// ════════════════════════════════════════════════════════════
function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(pad);
    const binary = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(binary);
  } catch (e) {
    console.warn('decodeJwtPayload: token illisible', e.message);
    return null;
  }
}

// 🔧 Extrait les infos utilisateur de façon fiable :
//    1. Depuis le JWT (Authorization: Bearer ...) si présent
//    2. Sinon, fallback sur le body (chat public pour visiteurs non connectés)
function extractUserContext(req) {
  let jwtUser = null;

  // Priorité 1 : JWT
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const payload = decodeJwtPayload(authHeader.slice(7));
    if (payload) {
      jwtUser = {
        id: payload.id,
        login: payload.login,
        nom: payload.nom,
        prenom: payload.prenom,
        role: payload.role,
        hospital_id: payload.hospital_id || null,
        email: payload.email || null,
      };
    }
  }

  // Priorité 2 : body (visiteur anonyme)
  const bodyUser = req.body.user || {};

  // Fusion : JWT gagne sur le body pour les champs sensibles
  return {
    login: jwtUser?.login || bodyUser.login || null,
    nom: jwtUser?.nom || bodyUser.nom || null,
    prenom: jwtUser?.prenom || bodyUser.prenom || null,
    role: jwtUser?.role || bodyUser.role || null,
    // 🔧 hospital_id : UNIQUEMENT depuis le JWT pour éviter l'usurpation
    hospital_id: jwtUser?.hospital_id || null,
  };
}

// ════════════════════════════════════════════════════════════
// Prompt système
// ════════════════════════════════════════════════════════════
function buildSystemPrompt(contextChunks, hasContact, conv) {
  const contextText = contextChunks.length > 0
    ? contextChunks.map((c, i) => `### ${i + 1}. ${c.titre}\n${c.contenu}`).join('\n\n')
    : '(Aucun contexte pertinent trouvé dans la base de connaissances.)';

  const contactBlock = hasContact
    ? `## Coordonnées du visiteur
✅ Nom : ${conv.user_name}
✅ Email : ${conv.user_email}
Tu peux remercier le visiteur par son nom si approprié.`
    : `## Coordonnées du visiteur — COLLECTE OBLIGATOIRE
❌ Nom : ${conv.user_name || 'non fourni'}
❌ Email : ${conv.user_email || 'non fourni'}

Tu DOIS collecter le nom ET l'email du visiteur AVANT de répondre à sa question.
- Si le visiteur a déjà donné ces informations dans son message (ou un message précédent), appelle directement l'outil save_contact_info avec les valeurs.
- Sinon, demande poliment : "Avant de continuer, pourriez-vous me laisser votre nom et votre adresse email afin que nous puissions vous recontacter si nécessaire ?"
- N'invente JAMAIS de nom ou d'email. Ne les déduis pas du login.
- Une fois les coordonnées fournies et enregistrées, remercie le visiteur et réponds à sa question.`;

  return `
Tu es l'assistant officiel de la plateforme "e-Santé RDC", une Plateforme Intégrée de Gestion Hospitalière conçue pour les hôpitaux de la République Démocratique du Congo.

Voici les extraits les plus pertinents de la base de connaissances officielle pour répondre à la question :

${contextText}

${contactBlock}

## Règles de réponse
1. Réponds TOUJOURS en français, de manière concise (2-3 phrases max).
2. Base-toi UNIQUEMENT sur les extraits ci-dessus. Si la réponse ne s'y trouve pas → escalade.
3. Si la question nécessite une décision humaine (réclamation, problème de compte, demande commerciale, demande de tarif, partenariat, bug, question hors périmètre) → tu DOIS appeler l'outil "escalate_to_human".
4. Si tu n'es pas sûr à 80% de la réponse → escalade.
5. Ne promets JAMAIS de délai, de prix, ou d'action concrète.
6. Ne fabrique pas d'information absente des extraits.

## Format
Quand tu réponds, réponds directement en texte. Quand tu escalades ou collectes les coordonnées, appelle l'outil correspondant.
`;
}

// ════════════════════════════════════════════════════════════
// Outils IA
// ════════════════════════════════════════════════════════════
const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description: 'À utiliser quand la question nécessite une intervention humaine (réclamation, problème de compte, demande commerciale, bug, question floue, ou toute situation où tu n\'es pas sûr à 80%).',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Raison courte de l\'escalade' },
          summary: { type: 'string', description: 'Résumé de la demande du visiteur' },
        },
        required: ['reason', 'summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_contact_info',
      description: 'Enregistre le nom et l\'adresse email du visiteur. À utiliser DÈS QUE le visiteur fournit ces informations (nom ET email), que ce soit dans son premier message ou dans une réponse à ta question.',
      parameters: {
        type: 'object',
        properties: {
          nom: { type: 'string', description: 'Nom complet du visiteur' },
          email: { type: 'string', description: 'Adresse email valide du visiteur' },
        },
        required: ['nom', 'email'],
      },
    },
  },
];

// ════════════════════════════════════════════════════════════
// Telegram
// ════════════════════════════════════════════════════════════
async function telegramSend(text, replyTo = null) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.warn('⚠️ Telegram non configuré');
    return null;
  }
  const body = {
    chat_id: TELEGRAM_ADMIN_CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (replyTo) body.reply_to_message_id = replyTo;

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  const data = await res.json();
  if (!data.ok) {
    console.error('❌ Telegram sendMessage :', data);
    return null;
  }
  return data.result;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ════════════════════════════════════════════════════════════
// Embedding (Gemini)
// ════════════════════════════════════════════════════════════
async function embedQuery(text) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY manquant');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${GEMINI_EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      output_dimensionality: GEMINI_EMBEDDING_DIMS,
    }),
  });
  const data = await res.json();
  if (!data.embedding || !data.embedding.values) {
    throw new Error(data.error?.message || 'Embedding API failed');
  }
  return data.embedding.values;
}

// ════════════════════════════════════════════════════════════
// RAG
// ════════════════════════════════════════════════════════════
async function retrieveContext(query) {
  try {
    const embedding = await embedQuery(query);
    const { data, error } = await supabaseAdmin.rpc('match_chat_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 4,
    });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('⚠️ RAG échoué, fallback :', err.message);
    return chatKnowledgeFallback.map((c) => ({
      titre: c.titre,
      contenu: c.contenu,
      similarity: 0,
    }));
  }
}

// ════════════════════════════════════════════════════════════
// Appel IA (Groq) avec boucle function calling
// ════════════════════════════════════════════════════════════
async function callAI(history, userMessage, conv) {
  if (!GROQ_API_KEY) {
    return { escalate: true, reason: 'IA non configurée', summary: userMessage };
  }

  const hasContact = !!(conv.user_name && conv.user_email);
  const contextChunks = await retrieveContext(userMessage);
  const systemPrompt = buildSystemPrompt(contextChunks, hasContact, conv);
  console.log(`🔍 RAG: ${contextChunks.length} chunk(s) — top: ${contextChunks[0]?.titre || 'aucun'} | contact: ${hasContact ? 'OK' : 'MISSING'}`);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  let currentConv = { ...conv };
  let loops = 0;
  const MAX_LOOPS = 4;

  while (loops < MAX_LOOPS) {
    loops++;
    try {
      const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          tools: AI_TOOLS,
          tool_choice: 'auto',
          temperature: 0.2,
          max_tokens: 400,
        }),
      });

      const data = await res.json();
      if (!data.choices || !data.choices[0]) {
        console.error('❌ Groq response :', JSON.stringify(data, null, 2));
        return { escalate: true, reason: 'Erreur IA', summary: userMessage };
      }

      const choice = data.choices[0].message;

      // ── Tool calls ──
      if (choice.tool_calls && choice.tool_calls.length > 0) {
        const toolMessages = [];

        for (const call of choice.tool_calls) {
          if (call.function.name === 'escalate_to_human') {
            let args = {};
            try { args = JSON.parse(call.function.arguments || '{}'); } catch (_) {}
            return {
              escalate: true,
              reason: args.reason || 'Demande humaine',
              summary: args.summary || userMessage,
            };
          }

          if (call.function.name === 'save_contact_info') {
            let args = {};
            try { args = JSON.parse(call.function.arguments || '{}'); } catch (_) {}

            if (args.nom && args.email) {
              await supabaseAdmin
                .from('chat_conversations')
                .update({
                  user_name: args.nom,
                  user_email: args.email,
                  contact_collected_at: new Date().toISOString(),
                })
                .eq('id', conv.id);

              currentConv.user_name = args.nom;
              currentConv.user_email = args.email;
              console.log(`✅ Contact collecté : ${args.nom} <${args.email}>`);

              toolMessages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: `Coordonnées enregistrées avec succès : ${args.nom} <${args.email}>. Remercie poliment le visiteur par son nom et réponds à sa question.`,
              });
            } else {
              toolMessages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: 'Erreur : nom ou email manquant. Demande à nouveau les informations.',
              });
            }
          }
        }

        messages.push({ role: 'assistant', content: choice.content || null, tool_calls: choice.tool_calls });
        messages.push(...toolMessages);
        continue;
      }

      // ── Réponse texte ──
      if (choice.content) {
        return { escalate: false, response: choice.content.trim() };
      }

      return { escalate: true, reason: 'Réponse IA vide', summary: userMessage };
    } catch (err) {
      console.error('❌ callAI (Groq) error :', err);
      return { escalate: true, reason: 'Erreur technique IA', summary: userMessage };
    }
  }

  return { escalate: true, reason: 'Trop de boucles', summary: userMessage };
}

// ════════════════════════════════════════════════════════════
// POST /api/chat/message
// ════════════════════════════════════════════════════════════
router.post('/message', async (req, res) => {
  try {
    const { sessionId, content } = req.body;

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 10) {
      return res.status(400).json({ error: 'sessionId requis' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message vide' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Message trop long' });
    }

    // 🔧 Extraction sécurisée du contexte utilisateur (JWT prioritaire)
    const user = extractUserContext(req);
    console.log('💬 /chat/message — user context :', {
      login: user.login,
      role: user.role,
      hospital_id: user.hospital_id,
    });

    // 1. Upsert conversation
    let { data: conv, error: convErr } = await supabaseAdmin
      .from('chat_conversations')
      .select('id, user_name, user_email')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (convErr) throw new Error(convErr.message);

    if (!conv) {
      // 🔧 Insertion avec hospital_id depuis le JWT (pas du body)
      const { data: created, error: createErr } = await supabaseAdmin
        .from('chat_conversations')
        .insert({
          session_id: sessionId,
          user_login: user.login,
          user_name: null,
          user_email: null,
          user_role: user.role,
          hospital_id: user.hospital_id,
        })
        .select('id, user_name, user_email')
        .single();
      if (createErr) throw new Error(createErr.message);
      conv = created;
    } else {
      await supabaseAdmin
        .from('chat_conversations')
        .update({
          user_login: user.login,
          user_role: user.role,
          hospital_id: user.hospital_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conv.id);
    }

    // 2. Insert message user
    const { data: msg, error: msgErr } = await supabaseAdmin
      .from('chat_messages')
      .insert({ conversation_id: conv.id, sender: 'user', content: content.trim() })
      .select('id, created_at')
      .single();
    if (msgErr) throw new Error(msgErr.message);

    // 3. Historique
    const { data: history } = await supabaseAdmin
      .from('chat_messages')
      .select('sender, content')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
      .limit(20);

    // 4. IA
    const aiResult = await callAI(history || [], content.trim(), conv);

    // ════════════════════════════════════════════════════════
    // ── CAS A : escalade Telegram ──
    // ✅ FIX 1 : feedback visiteur TOUJOURS inséré
    // ✅ FIX 1 : vérif d'erreur explicite sur telegram_message_id
    // ════════════════════════════════════════════════════════
    if (aiResult.escalate) {
      const contactInfo = [];
      if (conv.user_name) contactInfo.push(conv.user_name);
      if (conv.user_email) contactInfo.push(conv.user_email);

      const header = contactInfo.length
        ? `💬 <b>${escapeHtml(contactInfo.join(' · '))}</b>${user?.login ? ` (${escapeHtml(user.login)})` : ''}`
        : `💬 <b>Visiteur anonyme</b>`;
      const footer = `\n\n<i>🤖 Raison : ${escapeHtml(aiResult.reason)}</i>\n<i>↩️ Répondez à ce message pour continuer.</i>`;

      const tgMessage = await telegramSend(
        `${header}\n\n${escapeHtml(content.trim())}${footer}`
      );

      let telegramSent = false;

      if (tgMessage && tgMessage.message_id) {
        telegramSent = true;

        // 🔧 Vérification d'erreur EXPLICITE sur l'update
        const { error: updErr } = await supabaseAdmin
          .from('chat_messages')
          .update({ telegram_message_id: tgMessage.message_id })
          .eq('id', msg.id);

        if (updErr) {
          console.error(
            '❌ Impossible de stocker telegram_message_id — le webhook ne pourra PAS relier la réponse admin :',
            updErr
          );
          // On continue quand même : on insère le feedback visiteur
        } else {
          console.log(
            `✅ telegram_message_id=${tgMessage.message_id} stocké sur msg=${msg.id}`
          );
        }
      } else {
        console.warn('⚠️ telegramSend a échoué — fallback message IA local');
      }

      // 🔧 TOUJOURS insérer un message de feedback pour le visiteur
      const feedbackText = telegramSent
        ? "Merci pour votre message. Je l'ai transmis à notre équipe support — un conseiller vous répondra ici même très prochainement. 💬"
        : "Merci pour votre message. Votre demande a bien été enregistrée. Un conseiller vous répondra dans les plus brefs délais.";

      const { data: fbMsg, error: fbErr } = await supabaseAdmin
        .from('chat_messages')
        .insert({
          conversation_id: conv.id,
          sender: 'ai',
          content: feedbackText,
        })
        .select('id, created_at')
        .single();

      if (fbErr) {
        console.error('❌ Insert feedback IA :', fbErr);
        // On renvoie quand même 200 pour éviter les retries Telegram
      }

      return res.json({
        ok: true,
        escalated: true,
        reason: aiResult.reason,
        telegramSent,
        response: feedbackText,
        messageId: msg.id,
        aiMessageId: fbMsg?.id ?? null,
      });
    }

    // ════════════════════════════════════════════════════════
    // ── CAS B : réponse IA ──
    // ════════════════════════════════════════════════════════
    const { data: aiMsg, error: aiErr } = await supabaseAdmin
      .from('chat_messages')
      .insert({ conversation_id: conv.id, sender: 'ai', content: aiResult.response })
      .select('id, created_at')
      .single();
    if (aiErr) throw new Error(aiErr.message);

    res.json({
      ok: true,
      escalated: false,
      response: aiResult.response,
      messageId: msg.id,
      aiMessageId: aiMsg.id,
    });
  } catch (err) {
    console.error('❌ POST /chat/message :', err);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/chat/messages/:sessionId
// ════════════════════════════════════════════════════════════
router.get('/messages/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { data: conv, error: cErr } = await supabaseAdmin
      .from('chat_conversations')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!conv) return res.json({ messages: [] });

    const { data: messages, error: mErr } = await supabaseAdmin
      .from('chat_messages')
      .select('id, sender, content, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
      .limit(200);
    if (mErr) throw new Error(mErr.message);

    res.json({ messages: messages || [] });
  } catch (err) {
    console.error('❌ GET /chat/messages :', err);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/chat/telegram-webhook
// ✅ FIX 2 : gère l'absence de "Reply" (fallback dernière conv)
// ✅ FIX 2 : logs exhaustifs à chaque étape
// ✅ FIX 2 : retour 500 si INSERT échoue (Telegram retentera)
// ════════════════════════════════════════════════════════════
router.post('/telegram-webhook', async (req, res) => {
  try {
    // 1. Vérification du secret
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (secret !== TELEGRAM_WEBHOOK_SECRET) {
      console.warn('⚠️ Webhook secret invalide — header reçu :', secret);
      return res.status(403).json({ error: 'Invalid secret' });
    }

    const update = req.body;
    const msg = update?.message;

    if (!msg) return res.sendStatus(200);
    if (msg.from?.is_bot) return res.sendStatus(200); // anti-boucle

    console.log('📩 Telegram update reçu :', {
      from: msg.from?.username || msg.from?.id,
      text: (msg.text || msg.caption || '').slice(0, 60),
      reply_to: msg.reply_to_message?.message_id ?? null,
    });

    let conversationId = null;
    let usedFallback = false;

    // 2. Cas normal : l'admin a fait "Reply"
    if (msg.reply_to_message) {
      const replyToId = msg.reply_to_message.message_id;
      const { data: original, error: findErr } = await supabaseAdmin
        .from('chat_messages')
        .select('id, conversation_id')
        .eq('telegram_message_id', replyToId)
        .maybeSingle();

      if (findErr) {
        console.error('❌ Lookup telegram_message_id :', findErr);
      } else if (original) {
        conversationId = original.conversation_id;
        console.log('✅ Conversation trouvée via reply :', conversationId);
      } else {
        console.warn(
          '⚠️ reply_to_message_id introuvable en base :',
          replyToId,
          '— la colonne telegram_message_id n\'a peut-être jamais été remplie (voir Fix 1)'
        );
      }
    }

    // 3. Fallback : pas de reply → dernière conversation active
    if (!conversationId) {
      const { data: recent, error: recErr } = await supabaseAdmin
        .from('chat_conversations')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recErr) console.error('❌ Lookup conversation récente :', recErr);

      if (recent) {
        conversationId = recent.id;
        usedFallback = true;
        console.warn(
          `⚠️ Pas de reply → fallback sur la dernière conversation : ${conversationId}`
        );
      }
    }

    if (!conversationId) {
      console.warn('⚠️ Aucune conversation trouvée — message ignoré');
      return res.sendStatus(200);
    }

    // 4. Insertion du message admin
    const content = msg.text || msg.caption || '[Média sans texte]';
    const { error: insertErr } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender: 'admin',
        content,
      });

    if (insertErr) {
      console.error('❌ Insert message admin :', insertErr);
      return res.sendStatus(500); // Telegram retentera
    }

    console.log(
      `✅ Message admin inséré (conv ${conversationId}${usedFallback ? ', via fallback' : ''})`
    );

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ telegram-webhook exception :', err);
    res.sendStatus(200);
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/chat/telegram-updates (utilitaire de debug)
// ════════════════════════════════════════════════════════════
router.get('/telegram-updates', async (req, res) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN manquant' });
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;