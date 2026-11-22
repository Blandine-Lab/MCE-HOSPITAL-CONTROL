// backend/src/routes/chatKnowledge.js
// Base de connaissances structurée en chunks.
// Chaque chunk sera embedé via Gemini et stocké dans chat_knowledge.
// Objectif : couvrir TOUTES les questions réalistes d'un visiteur.

module.exports = [
  // ════════════════════════════════════════════════════════════
  // PRÉSENTATION
  // ════════════════════════════════════════════════════════════
  {
    slug: 'presentation-generale',
    titre: 'Présentation générale de la plateforme',
    categorie: 'presentation',
    contenu: `e-Santé RDC est une Plateforme Intégrée de Gestion Hospitalière conçue pour les hôpitaux de la République Démocratique du Congo. C'est un système unique qui permet à tous les hôpitaux congolais (publics, privés ou conventionnés) de gérer leurs activités médicales, administratives et financières depuis une seule interface. La plateforme centralise le dossier patient, les consultations, la pharmacie, la facturation, les ressources humaines, les finances et bien plus encore.`,
  },
  {
    slug: 'mission-vision',
    titre: 'Mission et bénéfices de la plateforme',
    categorie: 'presentation',
    contenu: `La mission de e-Santé RDC est de fournir un système unique pour tous les hôpitaux de la RDC. Les bénéfices principaux sont : gérer vos établissements, suivre vos patients, optimiser vos ressources, améliorer la qualité des soins, centraliser les données patients, réduire les erreurs médicales, améliorer la traçabilité, optimiser les ressources et faciliter la prise de décision grâce au reporting.`,
  },
  {
    slug: 'public-cible',
    titre: 'Public cible et types d\'établissements',
    categorie: 'presentation',
    contenu: `La plateforme e-Santé RDC s'adresse à tous les hôpitaux de la République Démocratique du Congo : hôpitaux publics, cliniques privées, centres de santé conventionnés, polycliniques, maternités, laboratoires d'analyses et tout établissement de soins souhaitant moderniser sa gestion. Elle convient aussi bien aux petits centres de santé qu'aux grands hôpitaux provinciaux.`,
  },
  {
    slug: 'multi-tenant',
    titre: 'Architecture multi-hôpitaux',
    categorie: 'presentation',
    contenu: `e-Santé RDC est une plateforme multi-tenant : chaque hôpital dispose de son propre espace isolé, avec ses propres utilisateurs, ses propres données et sa propre identité visuelle (logo, couleurs). Un super-administrateur gère la plateforme au niveau global, tandis que chaque hôpital gère ses propres utilisateurs et paramètres. Les données d'un hôpital ne sont jamais visibles par un autre hôpital.`,
  },
  {
    slug: 'langues-supportees',
    titre: 'Langues supportées',
    categorie: 'presentation',
    contenu: `La plateforme e-Santé RDC est actuellement disponible en français, qui est la langue officielle de la RDC et la langue de travail des établissements de santé. Les interfaces utilisateurs, les formulaires et les rapports sont tous en français.`,
  },

  // ════════════════════════════════════════════════════════════
  // AFFILIATION & PARTENARIAT
  // ════════════════════════════════════════════════════════════
  {
    slug: 'affiliation-procedure',
    titre: 'Comment être affilié à e-Santé RDC',
    categorie: 'affiliation',
    contenu: `Pour être affilié à la plateforme e-Santé RDC, un établissement de santé doit contacter l'équipe GLOBALMIND.MK.INNOTECH. Trois numéros WhatsApp sont disponibles : +39 333 311 9373 (Europe), +243 819 661 838 (RDC) et +243 987 170 739 (RDC). Vous pouvez aussi écrire à globalmindinnotech@gmail.com. L'équipe étudie la demande, valide l'éligibilité de l'établissement, puis procède à la création de son espace dédié sur la plateforme.`,
  },
  {
    slug: 'affiliation-contacts',
    titre: 'Contacts WhatsApp et email pour affiliation',
    categorie: 'affiliation',
    contenu: `Pour toute demande d'affiliation ou de partenariat avec e-Santé RDC, voici les contacts officiels de GLOBALMIND.MK.INNOTECH : WhatsApp +39 333 311 9373 (Europe), WhatsApp +243 819 661 838 (RDC), WhatsApp +243 987 170 739 (RDC), et email globalmindinnotech@gmail.com. Ces numéros sont disponibles sur WhatsApp pour discuter directement avec un conseiller.`,
  },
  {
    slug: 'affiliation-delais',
    titre: 'Délais d\'affiliation',
    categorie: 'affiliation',
    contenu: `Le délai d'affiliation à e-Santé RDC dépend de la taille de l'établissement et de la complexité de sa configuration. En général, après validation du dossier par l'équipe GLOBALMIND.MK.INNOTECH, la création de l'espace et la configuration initiale prennent quelques jours. La formation des équipes est planifiée dans la foulée. Pour un délai précis, contactez directement l'équipe via WhatsApp.`,
  },
  {
    slug: 'affiliation-documents',
    titre: 'Documents nécessaires pour l\'affiliation',
    categorie: 'affiliation',
    contenu: `Pour l'affiliation, l'établissement doit fournir : ses informations légales (nom, adresse, numéro d'agrément), le nom de son directeur ou responsable, le nombre approximatif de lits et de personnel, une liste des services existants, et un logo pour personnaliser son espace. L'équipe GLOBALMIND.MK.INNOTECH vous guidera sur les documents exacts à fournir lors du premier contact.`,
  },
  {
    slug: 'affiliation-partenariat',
    titre: 'Partenariat et revendeur',
    categorie: 'affiliation',
    contenu: `e-Santé RDC est ouverte aux partenariats avec des intégrateurs, des revendeurs ou des ONG souhaitant déployer la plateforme dans plusieurs établissements. Pour discuter d'un partenariat commercial ou technique, contactez GLOBALMIND.MK.INNOTECH par WhatsApp au +39 333 311 9373 ou +243 819 661 838, ou par email à globalmindinnotech@gmail.com.`,
  },

  // ════════════════════════════════════════════════════════════
  // TARIFS & LICENCES
  // ════════════════════════════════════════════════════════════
  {
    slug: 'tarifs-licence',
    titre: 'Tarifs et licences',
    categorie: 'tarifs',
    contenu: `Les tarifs de la plateforme e-Santé RDC dépendent de la taille de l'établissement (nombre de lits, nombre d'utilisateurs) et des modules activés. Il n'y a pas de tarif public fixe : chaque établissement reçoit une proposition personnalisée. Pour obtenir un devis précis, contactez directement GLOBALMIND.MK.INNOTECH par WhatsApp au +39 333 311 9373, +243 819 661 838 ou +243 987 170 739.`,
  },
  {
    slug: 'tarifs-essai',
    titre: 'Essai gratuit',
    categorie: 'tarifs',
    contenu: `e-Santé RDC propose une démonstration personnalisée et un essai gratuit de la plateforme pour les établissements intéressés. Pour planifier une démonstration, contactez l'équipe GLOBALMIND.MK.INNOTECH par WhatsApp au +243 819 661 838 ou +39 333 311 9373. La démonstration est adaptée aux besoins spécifiques de votre établissement.`,
  },
  {
    slug: 'tarifs-paiement',
    titre: 'Modalités de paiement',
    categorie: 'tarifs',
    contenu: `Les modalités de paiement de la licence e-Santé RDC sont discutées au cas par cas avec GLOBALMIND.MK.INNOTECH. Des solutions sont possibles pour les établissements publics, les cliniques privées et les ONG. Les paiements peuvent être mensuels, trimestriels ou annuels selon vos préférences. Contactez l'équipe pour discuter des options adaptées à votre budget.`,
  },

  // ════════════════════════════════════════════════════════════
  // MODULES
  // ════════════════════════════════════════════════════════════
  {
    slug: 'module-dpi',
    titre: 'Module Dossier Patient Unique (DPI)',
    categorie: 'module',
    contenu: `Le module Dossier Patient Unique (DPI) centralise l'ensemble des informations médicales d'un patient en un seul dossier. Il permet de retrouver l'historique complet des consultations, examens, prescriptions et hospitalisations d'un patient en quelques secondes. Le DPI évite les doublons, sécurise les données et garantit la continuité des soins entre les différents services.`,
  },
  {
    slug: 'module-consultations',
    titre: 'Module Consultations & Admissions',
    categorie: 'module',
    contenu: `Le module Consultations & Admissions gère les rendez-vous, les admissions, les urgences, les transferts entre services et les sorties. Il permet une vue globale du parcours patient dans l'établissement, depuis son arrivée jusqu'à sa sortie, avec traçabilité complète.`,
  },
  {
    slug: 'module-dme',
    titre: 'Module Médical (DME)',
    categorie: 'module',
    contenu: `Le module Dossier Médical Électronique (DME) permet aux médecins de saisir les observations cliniques, les diagnostics, les prescriptions et les comptes rendus de consultation. Il est étroitement lié au DPI et facilite la collaboration entre médecins d'un même établissement.`,
  },
  {
    slug: 'module-paramedical',
    titre: 'Module Paramédical & Soins',
    categorie: 'module',
    contenu: `Le module Paramédical & Soins gère le suivi des soins infirmiers, la planification des soins, les actes paramédicaux et le suivi patient quotidien. Il est utilisé par les infirmiers, aides-soignants et sages-femmes pour tracer tous les soins administrés.`,
  },
  {
    slug: 'module-facturation',
    titre: 'Module Facturation & Tiers Payant',
    categorie: 'module',
    contenu: `Le module Facturation & Tiers Payant gère les factures, les prestations, les tarifs, les paiements et le tiers payant (assurances, mutuelles). Il permet de suivre la facturation patient en temps réel et d'éditer des rapports financiers détaillés.`,
  },
  {
    slug: 'module-labo',
    titre: 'Module Laboratoire & Imagerie',
    categorie: 'module',
    contenu: `Le module Laboratoire & Imagerie gère les examens de biologie et d'imagerie, les résultats, la validation des comptes rendus et l'impression des résultats. Il couvre tous les types d'examens : analyses sanguines, radiographies, échographies, scanners, etc.`,
  },
  {
    slug: 'module-pharmacie',
    titre: 'Module Pharmacie',
    categorie: 'module',
    contenu: `Le module Pharmacie gère les médicaments, les lots, les dates de péremption, la délivrance, les ordonnances, les retours et les commandes fournisseurs. Il inclut la pharmacovigilance et la gestion des stupéfiants avec traçabilité renforcée.`,
  },
  {
    slug: 'module-rh',
    titre: 'Module Ressources Humaines & Planning',
    categorie: 'module',
    contenu: `Le module RH & Planning gère les employés, les contrats, les congés, les absences, les plannings de service et les statistiques RH. Il permet de planifier les gardes, de suivre les formations et de gérer les carrières du personnel.`,
  },
  {
    slug: 'module-finances',
    titre: 'Module Finances & Comptabilité',
    categorie: 'module',
    contenu: `Le module Finances & Comptabilité gère les comptes, les écritures comptables, les journaux, les budgets, les paiements et les rapports financiers. Il respecte les normes comptables et facilite la production des états financiers.`,
  },
  {
    slug: 'module-stock',
    titre: 'Module Stock & Approvisionnement',
    categorie: 'module',
    contenu: `Le module Stock & Approvisionnement gère les produits, les stocks, les mouvements, les fournisseurs, les commandes et les inventaires. Il permet d'éviter les ruptures de stock et d'optimiser les achats.`,
  },
  {
    slug: 'module-qualite',
    titre: 'Module Qualité & Risques',
    categorie: 'module',
    contenu: `Le module Qualité & Risques gère les signalements, les audits, les actions CAPA (correctives et préventives), les indicateurs de qualité, les non-conformités et les évaluations de risques. Il aide les établissements à obtenir et maintenir leurs certifications qualité.`,
  },
  {
    slug: 'module-reporting',
    titre: 'Module Reporting & Décisionnel (BI)',
    categorie: 'module',
    contenu: `Le module Reporting & Décisionnel (BI) fournit des tableaux de bord, des rapports personnalisés et des exports pour aider la direction à prendre des décisions basées sur les données. Il permet de suivre les indicateurs clés (KPI) de l'établissement en temps réel.`,
  },
  {
    slug: 'module-securite',
    titre: 'Module Sécurité & Conformité',
    categorie: 'module',
    contenu: `Le module Sécurité & Conformité gère les rôles, les permissions, les logs d'accès, les sessions utilisateurs et les tentatives de connexion. Il assure la traçabilité complète des actions et permet de respecter les exigences de conformité et de protection des données de santé.`,
  },
  {
    slug: 'module-interop',
    titre: 'Module Interopérabilité',
    categorie: 'module',
    contenu: `Le module Interopérabilité permet à e-Santé RDC d'échanger des données avec des systèmes tiers : systèmes d'assurance, laboratoires externes, plateformes nationales de santé. Il gère les flux, les webhooks et les logs d'échange selon les standards HL7/FHIR.`,
  },
  {
    slug: 'module-bloc',
    titre: 'Module Bloc opératoire',
    categorie: 'module',
    contenu: `Le module Bloc opératoire gère le planning des salles, les interventions chirurgicales, les équipes, les compte-rendus opératoires et les statistiques du bloc. Il permet une meilleure coordination entre chirurgiens, anesthésistes et personnel de bloc.`,
  },
  {
    slug: 'module-bibliotheque',
    titre: 'Module Bibliothèque',
    categorie: 'module',
    contenu: `Le module Bibliothèque centralise les documents et ressources internes de l'hôpital : politiques, procédures, protocoles, rapports, avec gestion fine des droits d'accès et d'upload. Chaque document peut être visible uniquement par certains rôles ou certains utilisateurs.`,
  },

  // ════════════════════════════════════════════════════════════
  // TECHNIQUE
  // ════════════════════════════════════════════════════════════
  {
    slug: 'technique-materiel',
    titre: 'Matériel et configuration requise',
    categorie: 'technique',
    contenu: `e-Santé RDC est une application web accessible depuis n'importe quel navigateur moderne (Chrome, Firefox, Edge, Safari). Aucune installation locale n'est nécessaire. Pour un usage optimal, un ordinateur avec 4 Go de RAM, un écran 1920x1080 et une connexion internet stable (au moins 2 Mbps) sont recommandés. La plateforme fonctionne aussi sur tablette.`,
  },
  {
    slug: 'technique-connexion',
    titre: 'Connexion internet et mode hors-ligne',
    categorie: 'technique',
    contenu: `e-Santé RDC nécessite une connexion internet pour la synchronisation des données. Un mode hors-ligne partiel existe pour les consultations et la saisie de données, avec synchronisation automatique dès le retour de la connexion. Pour les établissements avec connexion instable, une configuration spéciale peut être étudiée avec l'équipe technique.`,
  },
  {
    slug: 'technique-hebergement',
    titre: 'Hébergement et disponibilité',
    categorie: 'technique',
    contenu: `e-Santé RDC est hébergée sur une infrastructure cloud sécurisée avec haute disponibilité. Les serveurs sont accessibles 24h/24 et 7j/7, avec un taux de disponibilité supérieur à 99%. Des sauvegardes automatiques quotidiennes sont effectuées pour garantir la sécurité des données.`,
  },
  {
    slug: 'technique-migration',
    titre: 'Migration des données existantes',
    categorie: 'technique',
    contenu: `Si votre établissement possède déjà des données dans un ancien système (Excel, autre logiciel), une migration peut être organisée. L'équipe GLOBALMIND.MK.INNOTECH vous accompagne dans l'import des données patients, du personnel et des référentiels. La migration est planifiée lors de la phase d'affiliation.`,
  },
  {
    slug: 'technique-navigateur',
    titre: 'Navigateurs et appareils compatibles',
    categorie: 'technique',
    contenu: `e-Santé RDC fonctionne sur tous les navigateurs modernes : Google Chrome (recommandé), Mozilla Firefox, Microsoft Edge et Safari. La plateforme est responsive et s'adapte aux ordinateurs, tablettes et smartphones. Aucune application à télécharger n'est nécessaire : tout se passe dans le navigateur.`,
  },
  {
    slug: 'technique-impression',
    titre: 'Impression et édition de documents',
    categorie: 'technique',
    contenu: `e-Santé RDC permet d'imprimer directement depuis le navigateur : factures, ordonnances, comptes-rendus, résultats d'examens, badges, contrats. Les documents sont générés en PDF haute qualité et peuvent être envoyés par email ou archivés. Toutes les imprimantes compatibles avec votre navigateur fonctionnent.`,
  },

  // ════════════════════════════════════════════════════════════
  // SÉCURITÉ & DONNÉES
  // ════════════════════════════════════════════════════════════
  {
    slug: 'securite-donnees',
    titre: 'Sécurité et confidentialité des données',
    categorie: 'securite',
    contenu: `Les données de santé sont hautement sensibles. e-Santé RDC applique des mesures de sécurité strictes : chiffrement SSL/TLS pour toutes les communications, isolation par hôpital (multi-tenant), contrôle d'accès par rôle, journalisation complète des accès et sauvegardes chiffrées. Chaque hôpital ne voit que ses propres données, jamais celles d'un autre établissement.`,
  },
  {
    slug: 'securite-conformite',
    titre: 'Conformité et réglementation',
    categorie: 'securite',
    contenu: `e-Santé RDC est conçue en conformité avec les bonnes pratiques de protection des données de santé et les réglementations en vigueur en RDC. La plateforme respecte les principes de minimisation des données, de consentement patient et de traçabilité des accès. Pour les détails précis sur la conformité, contactez GLOBALMIND.MK.INNOTECH.`,
  },
  {
    slug: 'securite-roles',
    titre: 'Gestion des rôles et permissions',
    categorie: 'securite',
    contenu: `e-Santé RDC permet de définir précisément qui peut voir quoi : chaque utilisateur a un rôle (admin, médecin, infirmier, pharmacien, secrétaire, etc.) avec des permissions spécifiques. Les administrateurs peuvent créer des rôles personnalisés, restreindre l'accès à certains modules et auditer toutes les actions.`,
  },
  {
    slug: 'securite-sauvegarde',
    titre: 'Sauvegarde et récupération des données',
    categorie: 'securite',
    contenu: `Les données e-Santé RDC sont sauvegardées automatiquement chaque jour. En cas d'incident, une restauration rapide est possible. Les hôpitaux peuvent également exporter leurs données à tout moment depuis l'interface d'administration pour conserver une copie locale.`,
  },

  // ════════════════════════════════════════════════════════════
  // FORMATION & SUPPORT
  // ════════════════════════════════════════════════════════════
  {
    slug: 'formation-equipes',
    titre: 'Formation des équipes',
    categorie: 'formation',
    contenu: `Lors de l'affiliation, une formation est organisée pour les équipes de l'établissement : administrateurs, médecins, infirmiers, pharmaciens, secrétaires, comptables. La formation couvre les modules utilisés par chaque profil et est adaptée au niveau de chaque utilisateur. Des supports de formation (vidéos, PDF) sont fournis.`,
  },
  {
    slug: 'support-technique',
    titre: 'Support technique',
    categorie: 'support',
    contenu: `En cas de problème technique, plusieurs canaux sont disponibles : WhatsApp au +39 333 311 9373 ou +243 819 661 838, email à globalmindinnotech@gmail.com. Le support est assuré par l'équipe GLOBALMIND.MK.INNOTECH. Les incidents critiques sont traités en priorité, avec un délai de prise en charge rapide.`,
  },
  {
    slug: 'support-formation',
    titre: 'Support après formation',
    categorie: 'support',
    contenu: `Une fois les équipes formées, l'accompagnement continue : assistance par WhatsApp, mises à jour régulières, webinaires et sessions de rappel. L'équipe GLOBALMIND.MK.INNOTECH reste disponible pour répondre aux questions et ajuster la configuration selon l'évolution des besoins de l'établissement.`,
  },
  {
    slug: 'support-evolution',
    titre: 'Mises à jour et évolutions',
    categorie: 'support',
    contenu: `e-Santé RDC évolue en permanence : nouveaux modules, améliorations d'ergonomie, corrections de bugs, ajouts de fonctionnalités demandées par les utilisateurs. Les mises à jour sont déployées automatiquement, sans interruption de service. Les établissements peuvent soumettre des demandes d'évolution via le support.`,
  },

  // ════════════════════════════════════════════════════════════
  // FAQ
  // ════════════════════════════════════════════════════════════
  {
    slug: 'faq-multi-etablissements',
    titre: 'Gestion de plusieurs établissements',
    categorie: 'faq',
    contenu: `e-Santé RDC permet à un même groupe hospitalier de gérer plusieurs établissements depuis un seul compte super-administrateur. Chaque établissement conserve ses données isolées, mais le super-administrateur peut consulter les rapports consolidés de l'ensemble du groupe.`,
  },
  {
    slug: 'faq-patients-externes',
    titre: 'Patients d\'autres hôpitaux',
    categorie: 'faq',
    contenu: `Un patient peut être consulté dans plusieurs hôpitaux utilisant e-Santé RDC, mais son dossier médical reste propre à chaque établissement. Le partage de données entre établissements n'est possible qu'avec le consentement du patient et via le module d'interopérabilité.`,
  },
  {
    slug: 'faq-devenir-utilisateur',
    titre: 'Créer un compte utilisateur',
    categorie: 'faq',
    contenu: `Les comptes utilisateurs sont créés par l'administrateur de chaque hôpital. Un utilisateur ne peut pas s'inscrire seul : c'est l'admin de son établissement qui lui crée un compte avec un rôle et des permissions. Pour obtenir un compte, contactez l'administrateur e-Santé RDC de votre hôpital.`,
  },
  {
    slug: 'faq-perte-mot-de-passe',
    titre: 'Mot de passe oublié',
    categorie: 'faq',
    contenu: `En cas d'oubli de mot de passe, contactez l'administrateur de votre hôpital qui peut réinitialiser votre mot de passe depuis l'interface d'administration. Pour des raisons de sécurité, les mots de passe ne peuvent pas être récupérés, seulement réinitialisés.`,
  },
  {
    slug: 'faq-donnees-propriete',
    titre: 'Propriété des données',
    categorie: 'faq',
    contenu: `Les données saisies dans e-Santé RDC appartiennent à l'établissement de santé qui les a créées. GLOBALMIND.MK.INNOTECH n'utilise jamais ces données à des fins commerciales ou statistiques sans autorisation explicite. Chaque hôpital peut exporter toutes ses données à tout moment.`,
  },

  // ════════════════════════════════════════════════════════════
  // CONTACT
  // ════════════════════════════════════════════════════════════
  {
    slug: 'editeur-contact',
    titre: 'Éditeur et contacts officiels',
    categorie: 'contact',
    contenu: `La plateforme e-Santé RDC est conçue, développée et maintenue par GLOBALMIND.MK.INNOTECH. Contacts officiels : WhatsApp +39 333 311 9373 (Europe), WhatsApp +243 819 661 838 (RDC), WhatsApp +243 987 170 739 (RDC), email globalmindinnotech@gmail.com. L'équipe est disponible pour toute question sur l'affiliation, les tarifs, le support ou les partenariats.`,
  },
];