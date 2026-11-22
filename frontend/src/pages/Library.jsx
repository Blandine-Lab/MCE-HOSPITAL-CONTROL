import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FaFolder, FaFolderOpen, FaFile, FaFilePdf, FaFileWord, FaFileExcel,
  FaFileImage, FaFileVideo, FaUpload, FaDownload, FaTrash, FaPlus,
  FaChevronRight, FaChevronDown, FaLock,
} from 'react-icons/fa';
import api from '../axios';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';   // ⬅️ ajouté

function FileIcon({ type, size = 20 }) {
  const icons = {
    pdf: { Icon: FaFilePdf, color: '#dc2626' },
    doc: { Icon: FaFileWord, color: '#2563eb' },
    docx: { Icon: FaFileWord, color: '#2563eb' },
    xls: { Icon: FaFileExcel, color: '#16a34a' },
    xlsx: { Icon: FaFileExcel, color: '#16a34a' },
    csv: { Icon: FaFileExcel, color: '#16a34a' },
    jpg: { Icon: FaFileImage, color: '#a855f7' },
    jpeg: { Icon: FaFileImage, color: '#a855f7' },
    png: { Icon: FaFileImage, color: '#a855f7' },
    gif: { Icon: FaFileImage, color: '#a855f7' },
    webp: { Icon: FaFileImage, color: '#a855f7' },
    mp4: { Icon: FaFileVideo, color: '#f97316' },
    mov: { Icon: FaFileVideo, color: '#f97316' },
  };
  const { Icon, color } = icons[type?.toLowerCase()] || { Icon: FaFile, color: '#64748b' };
  return <Icon size={size} style={{ color }} />;
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TreeNode({ node, selectedId, expanded, onToggle, onSelect, depth = 0 }) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        style={{
          paddingLeft: 8 + depth * 16,
          paddingRight: 8,
          paddingTop: 6,
          paddingBottom: 6,
          cursor: 'pointer',
          backgroundColor: isSelected ? '#e0f2fe' : 'transparent',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: isSelected ? '#0369a1' : '#334155',
          fontWeight: isSelected ? 600 : 400,
        }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <span
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            style={{ display: 'flex', alignItems: 'center', width: 12 }}
          >
            {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
          </span>
        ) : (
          <span style={{ width: 12 }} />
        )}
        {isExpanded ? (
          <FaFolderOpen size={14} style={{ color: '#0ea5e9' }} />
        ) : (
          <FaFolder size={14} style={{ color: '#0ea5e9' }} />
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.icon && <span style={{ marginRight: 4 }}>{node.icon}</span>}
          {node.nom}
        </span>
        {node.restricted && <FaLock size={10} style={{ color: '#dc2626' }} />}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Library() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = usePermissions();
  const { user } = useAuth();   // ⬅️ ajouté

  // 🔑 Fallback robuste : on autorise si AU MOINS UN critère passe
  const canManage =
    isAdmin ||
    isSuperAdmin ||
    user?.is_super_admin === true ||
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    (Array.isArray(user?.permissions) && user.permissions.includes('manage_users'));

  const [tree, setTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [treeError, setTreeError] = useState('');

  const [folderData, setFolderData] = useState(null);
  const [loadingFolder, setLoadingFolder] = useState(false);

  const [expanded, setExpanded] = useState(new Set());
  const [toast, setToast] = useState(null);

  const [uploadModal, setUploadModal] = useState({ open: false, file: null, title: '', description: '', uploading: false });
  const [newFolderModal, setNewFolderModal] = useState({ open: false, nom: '', icon: '📁', creating: false });
  const [permModal, setPermModal] = useState({ open: false, permissions: [], saving: false });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setLoadingTree(true);
    api.get('/library/tree')
      .then((res) => {
        setTree(res.data.folders || []);
        const initial = new Set();
        (res.data.folders || []).forEach((f) => initial.add(f.id));
        setExpanded(initial);
      })
      .catch((err) => {
        setTreeError(err.response?.data?.error || err.message);
      })
      .finally(() => setLoadingTree(false));
  }, []);

  useEffect(() => {
    if (!folderId) {
      setFolderData(null);
      return;
    }
    setLoadingFolder(true);
    api.get(`/library/folders/${folderId}`)
      .then((res) => setFolderData(res.data))
      .catch((err) => {
        showToast(err.response?.data?.error || err.message, 'error');
        setFolderData(null);
      })
      .finally(() => setLoadingFolder(false));
  }, [folderId]);

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectFolder = (id) => navigate(`/library/${id}`);

  const reloadTree = async () => {
    try {
      const res = await api.get('/library/tree');
      setTree(res.data.folders || []);
    } catch (err) {
      console.error(err);
    }
  };

  const reloadFolder = async () => {
    if (!folderId) return;
    try {
      const res = await api.get(`/library/folders/${folderId}`);
      setFolderData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadModal.file || !uploadModal.title) return;
    setUploadModal((m) => ({ ...m, uploading: true }));
    try {
      const form = new FormData();
      form.append('file', uploadModal.file);
      form.append('folder_id', folderId);
      form.append('title', uploadModal.title);
      if (uploadModal.description) form.append('description', uploadModal.description);
      await api.post('/library/documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Document uploadé');
      setUploadModal({ open: false, file: null, title: '', description: '', uploading: false });
      await reloadFolder();
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
      setUploadModal((m) => ({ ...m, uploading: false }));
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/library/documents/${doc.id}/download`);
      window.open(res.data.url, '_blank');
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Supprimer "${doc.title}" ?`)) return;
    try {
      await api.delete(`/library/documents/${doc.id}`);
      showToast('Document supprimé');
      await reloadFolder();
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderModal.nom || !folderId) return;
    setNewFolderModal((m) => ({ ...m, creating: true }));
    try {
      await api.post('/library/folders', {
        parent_id: folderId,
        nom: newFolderModal.nom,
        icon: newFolderModal.icon,
      });
      showToast('Sous-dossier créé');
      setNewFolderModal({ open: false, nom: '', icon: '📁', creating: false });
      await Promise.all([reloadTree(), reloadFolder()]);
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
      setNewFolderModal((m) => ({ ...m, creating: false }));
    }
  };

  const handleSavePermissions = async (e) => {
    e.preventDefault();
    setPermModal((m) => ({ ...m, saving: true }));
    try {
      await api.patch(`/library/folders/${folderId}/permissions`, {
        permissions: permModal.permissions.filter((p) => p.can_read || p.can_write),
      });
      showToast('Permissions mises à jour');
      setPermModal((m) => ({ ...m, open: false, saving: false }));
      await reloadFolder();
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
      setPermModal((m) => ({ ...m, saving: false }));
    }
  };

  const AVAILABLE_ROLES = ['admin', 'medecin', 'infirmier', 'pharmacien', 'laborantin', 'rh', 'comptable', 'qualite', 'secretaire'];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 36px)', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 50, right: 20,
          background: toast.type === 'error' ? '#dc2626' : '#16a34a',
          color: 'white', padding: '10px 20px', borderRadius: 8,
          zIndex: 2000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{
        width: 320, flexShrink: 0, background: 'white',
        borderRight: '1px solid #e2e8f0', overflowY: 'auto',
        maxHeight: 'calc(100vh - 36px)',
      }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0' }}>
          <Link to="/library" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            textDecoration: 'none', color: '#0f172a', fontWeight: 700, fontSize: 16,
          }}>
            📚 Bibliothèque
          </Link>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
            Livres, rapports et documents
          </p>
        </div>
        <div style={{ padding: 8 }}>
          {loadingTree && <p style={{ padding: 16, color: '#64748b' }}>Chargement…</p>}
          {treeError && <p style={{ padding: 16, color: '#dc2626' }}>{treeError}</p>}
          {!loadingTree && tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              selectedId={folderId}
              expanded={expanded}
              onToggle={toggleExpand}
              onSelect={selectFolder}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        {!folderId && (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📚</div>
            <h2 style={{ color: '#0f172a', marginBottom: 8 }}>Bienvenue dans la bibliothèque</h2>
            <p>Sélectionnez un dossier à gauche pour voir son contenu.</p>
            <p style={{ fontSize: 13 }}>Les dossiers avec 🔒 sont réservés à certains rôles.</p>
            {canManage && (
              <p style={{ fontSize: 13, color: '#0ea5e9', marginTop: 12 }}>
                💡 Une fois un dossier ouvert, les boutons <b>Uploader</b>, <b>Sous-dossier</b> et <b>Permissions</b> apparaissent en haut à droite.
              </p>
            )}
          </div>
        )}

        {folderId && loadingFolder && <p style={{ color: '#64748b' }}>Chargement du dossier…</p>}

        {folderId && folderData && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ margin: 0, color: '#0f172a', fontSize: 22 }}>
                  📁 {folderData.folder.nom}
                </h1>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                  {folderData.children.length} sous-dossier(s) · {folderData.documents.length} document(s)
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {canManage && (
                  <>
                    <button onClick={() => setUploadModal({ open: true, file: null, title: '', description: '', uploading: false })} style={btnGreen}>
                      <FaUpload size={12} /> Uploader
                    </button>
                    <button onClick={() => setNewFolderModal({ open: true, nom: '', icon: '📁', creating: false })} style={btnBlue}>
                      <FaPlus size={12} /> Sous-dossier
                    </button>
                    <button
                      onClick={() => {
                        const perms = AVAILABLE_ROLES.map((role) => {
                          const existing = (folderData.permissions || []).find((p) => p.role === role);
                          return { role, can_read: existing?.can_read || false, can_write: existing?.can_write || false };
                        });
                        setPermModal({ open: true, permissions: perms, saving: false });
                      }}
                      style={btnGray}
                    >
                      <FaLock size={12} /> Permissions
                    </button>
                  </>
                )}
              </div>
            </div>

            {folderData.children.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <h3 style={h3}>Sous-dossiers</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {folderData.children.map((child) => (
                    <div
                      key={child.id}
                      onClick={() => selectFolder(child.id)}
                      style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <FaFolder size={24} style={{ color: '#0ea5e9', marginBottom: 8 }} />
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{child.nom}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 style={h3}>Documents ({folderData.documents.length})</h3>
              {folderData.documents.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b', background: 'white', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                  <FaFile size={32} style={{ color: '#cbd5e1', marginBottom: 8 }} />
                  <p style={{ margin: 0 }}>Aucun document dans ce dossier.</p>
                  {canManage && (
                    <button onClick={() => setUploadModal({ open: true, file: null, title: '', description: '', uploading: false })} style={{ ...btnGreen, marginTop: 12 }}>
                      <FaUpload size={12} /> Uploader le premier document
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {folderData.documents.map((doc) => (
                    <div key={doc.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <FileIcon type={doc.file_type} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.title}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                          {doc.file_name} · {formatBytes(doc.file_size_bytes)} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </div>
                        {doc.description && <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{doc.description}</div>}
                      </div>
                      <button onClick={() => handleDownload(doc)} style={iconBtn} title="Télécharger"><FaDownload size={14} /></button>
                      {canManage && (
                        <button onClick={() => handleDelete(doc)} style={{ ...iconBtn, color: '#dc2626' }} title="Supprimer"><FaTrash size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {uploadModal.open && (
        <Modal onClose={() => setUploadModal({ open: false, file: null, title: '', description: '', uploading: false })}>
          <h2 style={modalTitle}>📤 Uploader un document</h2>
          <form onSubmit={handleUpload}>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>Fichier *</label>
              <input
                type="file"
                onChange={(e) => {
                  const f = e.target.files[0];
                  setUploadModal((m) => ({ ...m, file: f, title: m.title || (f ? f.name.replace(/\.[^.]+$/, '') : '') }));
                }}
                required
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>Titre *</label>
              <input type="text" value={uploadModal.title} onChange={(e) => setUploadModal((m) => ({ ...m, title: e.target.value }))} required style={input} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Description</label>
              <textarea value={uploadModal.description} onChange={(e) => setUploadModal((m) => ({ ...m, description: e.target.value }))} rows={3} style={input} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setUploadModal({ open: false, file: null, title: '', description: '', uploading: false })} style={btnGray}>Annuler</button>
              <button type="submit" disabled={uploadModal.uploading} style={btnGreen}>{uploadModal.uploading ? 'Upload…' : 'Uploader'}</button>
            </div>
          </form>
        </Modal>
      )}

      {newFolderModal.open && (
        <Modal onClose={() => setNewFolderModal({ open: false, nom: '', icon: '📁', creating: false })}>
          <h2 style={modalTitle}>📁 Nouveau sous-dossier</h2>
          <form onSubmit={handleCreateFolder}>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>Nom *</label>
              <input type="text" value={newFolderModal.nom} onChange={(e) => setNewFolderModal((m) => ({ ...m, nom: e.target.value }))} required placeholder="Ex : Rapports 2025" style={input} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Icône (emoji)</label>
              <input type="text" value={newFolderModal.icon} onChange={(e) => setNewFolderModal((m) => ({ ...m, icon: e.target.value }))} maxLength={2} style={{ ...input, width: 80 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setNewFolderModal({ open: false, nom: '', icon: '📁', creating: false })} style={btnGray}>Annuler</button>
              <button type="submit" disabled={newFolderModal.creating} style={btnBlue}>{newFolderModal.creating ? 'Création…' : 'Créer'}</button>
            </div>
          </form>
        </Modal>
      )}

      {permModal.open && (
        <Modal onClose={() => setPermModal({ open: false, permissions: [], saving: false })}>
          <h2 style={modalTitle}>🔐 Permissions du dossier</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
            Cochez les rôles autorisés à lire ou écrire dans ce dossier.
            <br />Si aucun rôle n'est coché, le dossier sera ouvert à tous.
          </p>
          <form onSubmit={handleSavePermissions}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e2e8f0' }}>Rôle</th>
                  <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #e2e8f0' }}>Lecture</th>
                  <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #e2e8f0' }}>Écriture</th>
                </tr>
              </thead>
              <tbody>
                {permModal.permissions.map((p, idx) => (
                  <tr key={p.role} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 8 }}><b>{p.role}</b></td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <input type="checkbox" checked={p.can_read} onChange={(e) => {
                        const next = [...permModal.permissions];
                        next[idx] = { ...next[idx], can_read: e.target.checked };
                        setPermModal((m) => ({ ...m, permissions: next }));
                      }} />
                    </td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <input type="checkbox" checked={p.can_write} disabled={!p.can_read} onChange={(e) => {
                        const next = [...permModal.permissions];
                        next[idx] = { ...next[idx], can_write: e.target.checked };
                        setPermModal((m) => ({ ...m, permissions: next }));
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setPermModal({ open: false, permissions: [], saving: false })} style={btnGray}>Annuler</button>
              <button type="submit" disabled={permModal.saving} style={btnGreen}>{permModal.saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
        {children}
      </div>
    </div>
  );
}

const btnGreen = { background: '#16a34a', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 };
const btnBlue = { background: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 };
const btnGray = { background: '#e5e7eb', color: '#1f2937', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 };
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#475569', fontSize: 14 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, outline: 'none' };
const label = { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#334155' };
const modalTitle = { margin: '0 0 16px', fontSize: 18, color: '#0f172a' };
const h3 = { margin: '0 0 12px', fontSize: 15, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 };