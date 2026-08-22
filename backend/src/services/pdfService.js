// backend/src/services/pdfService.js
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const HOPITAL_NOM = process.env.HOPITAL_NOM || 'Medical Center Elizabeth MCE';

const LOGO_PATHS = [
  path.join(__dirname, '../../../frontend/public/logo.jpeg'),
  path.join(__dirname, '../../../frontend/public/logo.png'),
  path.join(__dirname, '../../uploads/logo.png'),
];

const loadLogo = async (doc) => {
  for (const logoPath of LOGO_PATHS) {
    try {
      if (fs.existsSync(logoPath)) {
        const buffer = fs.readFileSync(logoPath);
        const ext = path.extname(logoPath).toLowerCase();
        if (ext === '.png') return await doc.embedPng(buffer);
        if (ext === '.jpg' || ext === '.jpeg') return await doc.embedJpg(buffer);
      }
    } catch (_) {}
  }
  return null;
};

const generateExamPDF = async (examen) => {
  try {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

    const page = doc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    const drawText = (text, x, y, opts = {}) => {
      const { size = 12, font: f = font, color = rgb(0, 0, 0) } = opts;
      page.drawText(text, { x, y, size, font: f, color });
    };
    const drawLine = (x1, y1, x2, y2, color = rgb(0.8, 0.8, 0.8)) => {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 1, color });
    };

    // ---- LOGO ----
    const logo = await loadLogo(doc);
    const logoSize = 70;
    if (logo) {
      page.drawImage(logo, { x: margin, y: height - margin - logoSize, width: logoSize, height: logoSize });
      drawLine(margin + logoSize + 15, height - margin, margin + logoSize + 15, height - margin - logoSize);
    }
    const nomX = logo ? margin + logoSize + 30 : margin;
    const nomY = height - margin - 12;
    drawText(HOPITAL_NOM, nomX, nomY, { size: 22, font: fontBold, color: rgb(0.12, 0.23, 0.54) });
    drawText('Résultats du Laboratoire', nomX, nomY - 30, { size: 18, font: fontItalic, color: rgb(0.3, 0.3, 0.3) });

    const idText = `Examen #${examen.id}`;
    const idWidth = fontBold.widthOfTextAtSize(idText, 14);
    drawText(idText, width - margin - idWidth, height - margin - 12, { size: 14, font: fontBold, color: rgb(0.12, 0.23, 0.54) });

    y -= 40;
    drawLine(margin, y, width - margin, y, rgb(0.2, 0.4, 0.7));
    y -= 25;

    // ---- INFORMATIONS PATIENT (2 colonnes) ----
    const col1X = margin;
    const col2X = 320;
    const col1Width = 140;
    const col2Width = 140;

    const infoLine = (label, value, yPos, xPos, colWidth) => {
      drawText(label + ' :', xPos, yPos, { size: 11, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
      drawText(value, xPos + colWidth, yPos, { size: 11, font });
    };

    const patientNom = `${examen.patient_prenom || ''} ${examen.patient_nom || ''}`.trim() || 'Non renseigné';
    const medecin = examen.medecin_prescripteur || 'Non renseigné';
    const examenNom = examen.type_examen_nom || examen.type_examen || 'Non spécifié';
    const dateDemande = examen.date_demande ? new Date(examen.date_demande).toLocaleDateString('fr-FR') : 'Non renseignée';
    const service = examen.service_nom || 'Non renseigné';
    const datePrevue = examen.date_prevue ? new Date(examen.date_prevue).toLocaleDateString('fr-FR') : 'Non spécifiée';
    const typePrelevement = examen.type_prelevement || 'Non spécifié';
    const instructions = examen.instructions_preparation || 'Aucune';
    const motif = examen.description || 'Non renseigné';

    // Ligne 1
    infoLine('Patient', patientNom, y, col1X, col1Width);
    infoLine('Médecin prescripteur', medecin, y, col2X, col2Width);
    y -= 18;
    // Ligne 2
    infoLine('Examen', examenNom, y, col1X, col1Width);
    infoLine('Date demande', dateDemande, y, col2X, col2Width);
    y -= 18;
    // Ligne 3
    infoLine('Service', service, y, col1X, col1Width);
    infoLine('Date prévue', datePrevue, y, col2X, col2Width);
    y -= 18;
    // Ligne 4
    infoLine('Type prélèvement', typePrelevement, y, col1X, col1Width);
    // (on laisse la colonne 2 vide pour l'instant)
    y -= 18;
    // Instructions
    drawText('Instructions :', margin, y, { size: 11, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    drawText(instructions, margin + 100, y, { size: 11, font });
    y -= 18;
    // Motif
    drawText('Motif :', margin, y, { size: 11, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    drawText(motif, margin + 60, y, { size: 11, font });
    y -= 28;

    drawLine(margin, y, width - margin, y, rgb(0.8, 0.8, 0.8));
    y -= 20;

    // ---- TITRE TABLEAU ----
    drawText('Résultats des analyses', margin, y, { size: 16, font: fontBold, color: rgb(0.12, 0.23, 0.54) });
    y -= 22;

    // ---- TABLEAU DES RÉSULTATS (avec colonne "Résultat texte") ----
    const colWidths = [140, 70, 80, 60, 80, 90]; // Paramètre, Valeur, Texte, Unité, Référence, Interprétation
    const startX = margin;
    const tableY = y;
    const headers = ['Paramètre', 'Valeur', 'Résultat texte', 'Unité', 'Référence', 'Interprétation'];
    let xPos = startX;
    for (let i = 0; i < headers.length; i++) {
      drawText(headers[i], xPos, tableY, { size: 11, font: fontBold });
      xPos += colWidths[i];
    }

    let rowY = tableY - 18;
    const parametres = examen.parametres || [];
    for (const p of parametres) {
      let xPosRow = startX;
      const isNormal = p.interpretation === 'normal';
      const isAbnormal = p.interpretation === 'haut' || p.interpretation === 'bas';
      const color = isNormal ? rgb(0, 0.6, 0) : isAbnormal ? rgb(0.9, 0, 0) : rgb(0, 0, 0);

      // Paramètre
      const paramName = p.parametre_nom || p.nom || '';
      drawText(paramName, xPosRow, rowY, { color });
      xPosRow += colWidths[0];
      // Valeur
      drawText(p.valeur || '', xPosRow, rowY, { color });
      xPosRow += colWidths[1];
      // Résultat texte
      drawText(p.valeur_texte || '', xPosRow, rowY, { color });
      xPosRow += colWidths[2];
      // Unité
      drawText(p.unite || '', xPosRow, rowY, { color });
      xPosRow += colWidths[3];
      // Référence
      drawText(`${p.ref_min || ''} - ${p.ref_max || ''}`, xPosRow, rowY, { color });
      xPosRow += colWidths[4];
      // Interprétation
      let interp = '';
      if (p.interpretation === 'normal') interp = 'Normal';
      else if (p.interpretation === 'haut') interp = 'Haut';
      else if (p.interpretation === 'bas') interp = 'Bas';
      drawText(interp, xPosRow, rowY, { color });
      rowY -= 18;
    }

    y = rowY - 30;

    // ---- COMMENTAIRE ----
    drawText('Commentaire clinique', margin, y, { size: 14, font: fontBold, color: rgb(0.12, 0.23, 0.54) });
    y -= 20;
    const comment = examen.commentaire_global || 'Aucun commentaire';
    const lines = comment.split('\n');
    for (const line of lines) {
      drawText(line, margin + 5, y, { size: 11, font: fontItalic });
      y -= 16;
    }
    y -= 20;

    // ---- STATUT ET DATES ----
    const statut = examen.statut === 'valide' ? 'Validé' :
                   examen.statut === 'terminé' ? 'Saisie finalisée' :
                   examen.statut || 'En cours';
    drawText('Statut :', margin, y, { size: 11, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    drawText(statut, margin + 65, y, { size: 11, font });

    const dateResultat = examen.date_resultats ? new Date(examen.date_resultats).toLocaleDateString('fr-FR') : 'Non renseignée';
    drawText('Date résultat :', 300, y, { size: 11, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    drawText(dateResultat, 410, y, { size: 11, font });

    y -= 20;

    // ---- TECHNICIEN ----
    const technicien = (examen.technicien_nom && examen.technicien_prenom) ?
      `${examen.technicien_prenom} ${examen.technicien_nom}` : 'Non renseigné';
    drawText('Saisi par :', margin, y, { size: 11, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    drawText(technicien, margin + 85, y, { size: 11, font });

    const dateSaisie = examen.date_saisie ? new Date(examen.date_saisie).toLocaleDateString('fr-FR') : 'Non renseignée';
    drawText('Date saisie :', 300, y, { size: 11, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    drawText(dateSaisie, 385, y, { size: 11, font });

    y -= 20;

    // ---- BIOLOGISTE (si validé) ----
    if (examen.statut === 'valide') {
      const biologiste = (examen.biologiste_nom && examen.biologiste_prenom) ?
        `${examen.biologiste_prenom} ${examen.biologiste_nom}` : 'Non renseigné';
      drawText('Validé par :', margin, y, { size: 11, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
      drawText(biologiste, margin + 85, y, { size: 11, font });

      const dateValidation = examen.date_validation ? new Date(examen.date_validation).toLocaleDateString('fr-FR') : 'Non renseignée';
      drawText('Date validation :', 300, y, { size: 11, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
      drawText(dateValidation, 400, y, { size: 11, font });
    }

    y -= 35;

    // ---- PIED DE PAGE ----
    drawLine(margin, y, width - margin, y, rgb(0.8, 0.8, 0.8));
    y -= 18;
    const footerText = `Document généré le ${new Date().toLocaleString('fr-FR')} – ${HOPITAL_NOM} – Laboratoire d'analyses médicales`;
    drawText(footerText, margin, y, { size: 9, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('❌ Erreur dans generateExamPDF :', error);
    throw new Error(`Erreur de génération PDF : ${error.message}`);
  }
};

module.exports = { generateExamPDF };