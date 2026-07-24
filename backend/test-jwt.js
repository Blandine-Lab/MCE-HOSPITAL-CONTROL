// backend/test-jwt.js
require('dotenv').config({ path: './.env' });
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'une_cle_par_defaut_mais_changez_la';
console.log('🔐 Secret utilisé pour signer :', secret);

// Payload avec un ID utilisateur qui existe dans ta table (ex: id = 1)
const payload = { id: 1 };

// Générer un nouveau token valable 1 heure
const newToken = jwt.sign(payload, secret, { expiresIn: '1h' });
console.log('🆕 Nouveau token généré :', newToken);
console.log('📋 Copie ce token pour le test curl.');

// Vérifier immédiatement ce nouveau token
jwt.verify(newToken, secret, (err, decoded) => {
  if (err) {
    console.error('❌ La vérification du nouveau token a échoué :', err.message);
  } else {
    console.log('✅ La vérification du nouveau token a réussi :', decoded);
  }
});

// Test avec l'ancien token que tu avais (celui qui venait du frontend)
// Décommente la ligne ci-dessous et colle ton ancien token entre les guillemets pour le tester
// const oldToken = "TON_ANCIEN_TOKEN_COLLE_ICI";
// jwt.verify(oldToken, secret, (err, decoded) => {
//   if (err) {
//     console.error('❌ L\'ANCIEN token est invalide :', err.message);
//   } else {
//     console.log('✅ L\'ANCIEN token est valide :', decoded);
//   }
// });