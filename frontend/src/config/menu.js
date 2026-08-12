// src/config/menu.js
import {
  FaHome, FaUser, FaStethoscope, FaHospital, FaFlask,
  FaUsers, FaMoneyBill, FaBoxes, FaShieldAlt, FaChartLine,
  FaNetworkWired, FaClipboardList, FaPills, FaBed, FaCheckDouble,
  FaCut
} from 'react-icons/fa';

export const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: FaHome, permission: 'view_dashboard' },
  { path: '/patients', label: 'Patients', icon: FaUser, permission: 'view_patients' },
  { path: '/consultations', label: 'Consultations', icon: FaStethoscope, permission: 'view_consultations' },
  { path: '/medical', label: 'Mdical', icon: FaHospital, permission: 'view_medical' },
  { path: '/bloc', label: 'Bloc Opratoire', icon: FaCut, permission: 'view_medical' },
  { path: '/paramedical', label: 'Paramdical', icon: FaClipboardList, permission: 'view_paramedical' },
  { path: '/laboratoire', label: 'Labo & Imagerie', icon: FaFlask, permission: 'view_laboratory' },
  { path: '/rh', label: 'Ressources Humaines', icon: FaUsers, permission: 'view_rh' },
  { path: '/finance', label: 'Finances', icon: FaMoneyBill, permission: 'view_finance' },
  { path: '/stock', label: 'Stock', icon: FaBoxes, permission: 'view_stock' },
  { path: '/qualite', label: 'Qualit', icon: FaCheckDouble, permission: 'view_quality' },
  { path: '/reporting', label: 'Reporting / BI', icon: FaChartLine, permission: 'view_reporting' },
  { path: '/security', label: 'Scurit', icon: FaShieldAlt, permission: 'view_security' },
  { path: '/interoperabilite', label: 'Interoprabilit', icon: FaNetworkWired, permission: 'view_interoperabilite' },
  // ? Lien direct vers le tableau de bord pharmacie
  { path: '/pharmacy/dashboard', label: 'Pharmacie', icon: FaPills, permission: 'view_pharmacy' },
  // ? Gestion des lits (peut rester sur view_pharmacy ou view_stock selon votre choix)
  { path: '/lits', label: 'Gestion des lits', icon: FaBed, permission: 'view_pharmacy' },
];
