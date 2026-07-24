@echo off
chcp 65001 >nul
title Lancement de MCE - Medical Center Elizabeth

echo =====================================================
echo   Medical Center Elizabeth - Système de gestion
echo   Lancement de l'application (mode local)
echo =====================================================
echo.

:: Aller à la racine du projet (dossier où se trouve ce fichier)
cd /d "%~dp0"

:: Vérifier si le backend est déjà installé
if not exist "backend\node_modules" (
    echo ⚠️  Backend : les dépendances ne sont pas installées.
    echo    Lancement de npm install dans le dossier backend...
    cd backend
    call npm install
    cd ..
    echo ✅ Backend installé.
)

:: Vérifier si le frontend est déjà installé
if not exist "frontend\node_modules" (
    echo ⚠️  Frontend : les dépendances ne sont pas installées.
    echo    Lancement de npm install dans le dossier frontend...
    cd frontend
    call npm install
    cd ..
    echo ✅ Frontend installé.
)

:: Démarrer le serveur backend
echo.
echo 🔧 Démarrage du serveur backend...
start "MCE Backend" cmd /k "cd /d "%~dp0backend" && npm start"

:: Attendre quelques secondes pour que le backend soit prêt
echo ⏳ Attente du démarrage du backend (5 secondes)...
timeout /t 5 /nobreak >nul

:: Vérifier si le build du frontend existe, sinon utiliser le mode développement
if exist "frontend\build\index.html" (
    echo 📦 Build frontend trouvé - lancement en mode production (serveur statique).
    start "MCE Frontend" cmd /k "cd /d "%~dp0frontend" && npx serve -s build -l 3000"
) else (
    echo 🛠️  Build frontend non trouvé - lancement en mode développement (Vite).
    start "MCE Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
)

:: Attendre que le frontend soit prêt
echo ⏳ Attente du frontend (5 secondes)...
timeout /t 5 /nobreak >nul

:: Ouvrir le navigateur sur l'application
echo 🌐 Ouverture du navigateur sur http://localhost:3000
start http://localhost:3000

echo.
echo =====================================================
echo ✅ Tous les services sont lancés !
echo.
echo    ➤ Backend  : http://localhost:5000
echo    ➤ Frontend : http://localhost:3000
echo.
echo 📌 Pour arrêter, fermez les deux fenêtres CMD
echo    (MCE Backend et MCE Frontend).
echo =====================================================
pause