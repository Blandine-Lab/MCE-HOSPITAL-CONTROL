// src/pages/ui/UIShowcase.jsx ‚FCì Sections color√©es distinctes
import React, { useState } from 'react';

const UIShowcase = () => {
  const [inputValue, setInputValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showNotification = (type) => {
    alert(`Notification ${type} (d√©monstration)`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6 md:p-10 font-sans antialiased">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="text-center mb-12 relative">
          <div className="inline-block bg-white/70 backdrop-blur-sm px-8 py-4 rounded-2xl shadow-sm border border-white/50">
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500 tracking-tight">
              Interface Utilisateur
            </h1>
            <p className="text-gray-500 text-sm md:text-base mt-1 font-medium tracking-wide">
              Biblioth√®que de composants ¬∑ Design System v2
            </p>
          </div>
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-indigo-400 to-teal-400 rounded-full"></div>
        </header>

        {/* Grille principale */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* SECTION : Boutons - fond bleu clair */}
          <section className="bg-blue-50/80 rounded-2xl shadow-lg shadow-blue-100/50 p-6 border border-blue-100/60 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <span className="bg-blue-200 text-blue-700 p-1.5 rounded-lg text-sm">‚ú¶</span> Boutons
            </h2>
            <div className="flex flex-wrap gap-3 items-center">
              <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-medium shadow-md shadow-indigo-200 hover:shadow-indigo-300 hover:scale-105 transition-all duration-200">Primaire</button>
              <button className="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 hover:scale-105 transition-all duration-200">Secondaire</button>
              <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium shadow-md shadow-emerald-200 hover:shadow-emerald-300 hover:scale-105 transition-all duration-200">Succ√®s</button>
              <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white text-sm font-medium shadow-md shadow-rose-200 hover:shadow-rose-300 hover:scale-105 transition-all duration-200">Danger</button>
              <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-white text-sm font-medium shadow-md shadow-amber-200 hover:shadow-amber-300 hover:scale-105 transition-all duration-200">Avert.</button>
              <button className="px-5 py-2.5 rounded-xl border-2 border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 hover:scale-105 transition-all duration-200">Contour</button>
              <button className="px-5 py-2.5 rounded-xl text-gray-500 text-sm font-medium hover:bg-gray-100 hover:scale-105 transition-all duration-200">Fant√¥me</button>
              <button className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-medium shadow-md shadow-indigo-200 hover:shadow-indigo-300 hover:scale-105 transition-all duration-200">Petit</button>
              <button className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-base font-medium shadow-md shadow-indigo-200 hover:shadow-indigo-300 hover:scale-105 transition-all duration-200">Grand</button>
            </div>
          </section>

          {/* SECTION : Badges - fond vert clair */}
          <section className="bg-emerald-50/80 rounded-2xl shadow-lg shadow-emerald-100/50 p-6 border border-emerald-100/60 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <span className="bg-emerald-200 text-emerald-700 p-1.5 rounded-lg text-sm">üè∑Ô∏è</span> Badges
            </h2>
            <div className="flex flex-wrap gap-2">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 shadow-sm">Primaire</span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 shadow-sm">Succ√®s</span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 shadow-sm">Danger</span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 shadow-sm">Avert.</span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 shadow-sm">Neutre</span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 shadow-sm">Violet</span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-700 shadow-sm">Rose</span>
            </div>
          </section>

          {/* SECTION : Champs de saisie - fond violet clair (occupe 2 colonnes) */}
          <section className="lg:col-span-2 bg-violet-50/80 rounded-2xl shadow-lg shadow-violet-100/50 p-6 border border-violet-100/60 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <span className="bg-violet-200 text-violet-700 p-1.5 rounded-lg text-sm">‚úèÔ∏è</span> Champs de saisie
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nom complet</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                  placeholder="Votre nom"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Adresse email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                  placeholder="exemple@email.com"
                  defaultValue="Andre@gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Mot de passe</label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                  placeholder="‚FC¢‚FC¢‚FC¢‚FC¢‚FC¢‚FC¢‚FC¢‚FC¢"
                  defaultValue="‚FC¢‚FC¢‚FC¢"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Champ avec erreur</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-rose-300 bg-rose-50/80 focus:bg-white focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all duration-200 placeholder:text-rose-300"
                  placeholder="Exemple"
                />
                <p className="mt-1.5 text-sm text-rose-600 font-medium flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                  Ce champ est requis
                </p>
              </div>
            </div>
          </section>

          {/* SECTION : Cartes m√©triques - fond rose clair (occupe 2 colonnes) */}
          <section className="lg:col-span-2 bg-rose-50/80 rounded-2xl shadow-lg shadow-rose-100/50 p-6 border border-rose-100/60 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <span className="bg-rose-200 text-rose-700 p-1.5 rounded-lg text-sm">üìä</span> Cartes m√©triques
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white/70 backdrop-blur-sm p-5 rounded-xl border border-indigo-200/60 shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-xl text-2xl">üë§</div>
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Utilisateurs</p>
                    <p className="text-2xl font-bold text-gray-800">1 234</p>
                    <p className="text-xs text-emerald-600 font-medium">‚Üë 12% ce mois</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm p-5 rounded-xl border border-emerald-200/60 shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 p-3 rounded-xl text-2xl">üìà</div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Actifs</p>
                    <p className="text-2xl font-bold text-gray-800">876</p>
                    <p className="text-xs text-emerald-600 font-medium">‚Üë 8% ce mois</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm p-5 rounded-xl border border-violet-200/60 shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className="bg-violet-100 p-3 rounded-xl text-2xl">‚öôÔ∏è</div>
                  <div>
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Param√®tres</p>
                    <p className="text-2xl font-bold text-gray-800">42</p>
                    <p className="text-xs text-gray-500">Configurations</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION : Spinners - fond jaune clair */}
          <section className="bg-amber-50/80 rounded-2xl shadow-lg shadow-amber-100/50 p-6 border border-amber-100/60 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <span className="bg-amber-200 text-amber-700 p-1.5 rounded-lg text-sm">üîÑ</span> Spinners
            </h2>
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex flex-col items-center gap-1">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] text-gray-400 font-medium">Petit</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] text-gray-400 font-medium">Moyen</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] text-gray-400 font-medium">Grand</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                <span className="text-[10px] text-gray-400 font-medium">Gris</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] text-gray-400 font-medium">Vert</span>
              </div>
            </div>
          </section>

          {/* SECTION : Modal + Notifications - fond cyan clair */}
          <section className="bg-cyan-50/80 rounded-2xl shadow-lg shadow-cyan-100/50 p-6 border border-cyan-100/60 hover:shadow-xl transition-shadow duration-300 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-4">
                <span className="bg-cyan-200 text-cyan-700 p-1.5 rounded-lg text-sm">üì¶</span> Modal
              </h2>
              <button
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-medium shadow-md shadow-indigo-200 hover:shadow-indigo-300 hover:scale-105 transition-all duration-200"
                onClick={() => setIsModalOpen(true)}
              >
                Ouvrir la modal
              </button>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-4">
                <span className="bg-cyan-200 text-cyan-700 p-1.5 rounded-lg text-sm">üîî</span> Notifications
              </h2>
              <div className="flex flex-wrap gap-3">
                <button className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium shadow-sm shadow-emerald-200 hover:shadow-emerald-300 hover:scale-105 transition-all duration-200 flex items-center gap-1.5" onClick={() => showNotification('Succ√®s')}>
                  <span>‚úÖ</span> Succ√®s
                </button>
                <button className="px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium shadow-sm shadow-rose-200 hover:shadow-rose-300 hover:scale-105 transition-all duration-200 flex items-center gap-1.5" onClick={() => showNotification('Erreur')}>
                  <span>‚ùå</span> Erreur
                </button>
                <button className="px-4 py-2 rounded-xl bg-amber-400 text-white text-sm font-medium shadow-sm shadow-amber-200 hover:shadow-amber-300 hover:scale-105 transition-all duration-200 flex items-center gap-1.5" onClick={() => showNotification('Avertissement')}>
                  <span>‚ö†Ô∏è</span> Attention
                </button>
                <button className="px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-medium shadow-sm shadow-sky-200 hover:shadow-sky-300 hover:scale-105 transition-all duration-200 flex items-center gap-1.5" onClick={() => showNotification('Info')}>
                  <span>‚ÑπÔ∏è</span> Info
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-white/50 animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-gray-800">Confirmation</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  ‚úï
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Ceci est une modale de d√©monstration. Cliquez en dehors ou sur le bouton pour la fermer.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    alert('Action confirm√©e !');
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-gray-400 mt-12 pt-6 border-t border-gray-200/60">
          <p>¬© 2026 H√¥pital ¬∑ Interface Utilisateur (UI/UX) v2.0 ‚FCî Tous droits r√©serv√©s</p>
          <p className="mt-1 text-xs text-gray-300">Con√ßu avec ‚ù§Ô∏è et Tailwind CSS</p>
        </footer>

        {/* Animations */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.2s ease-out forwards;
          }
          .animate-slideUp {
            animation: slideUp 0.25s ease-out forwards;
          }
        `}</style>

      </div>
    </div>
  );
};

export default UIShowcase;
