import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  CarFront, Flag, LogOut, RefreshCw, ShieldCheck,
  Users, AlertTriangle, CheckCircle, Mail, Lock,
  Ban, CheckSquare, TrendingUp, FileText, ChevronDown, ChevronUp, X
} from 'lucide-react';
import ForgotPasswordPage from './ForgotPassword';
import ResetPasswordPage from './ResetPassword';
import './index.css';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

function App() {
  const [token, setToken]     = useState(null);
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState(null);

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  const openModal = (tipo, userId, reportId, nombre) => setConfirmModal({ tipo, userId, reportId, nombre });
  const closeModal = () => { if (!actionLoading) setConfirmModal(null); };

  useEffect(() => {
    const tk = localStorage.getItem('admin_token');
    if (tk) setToken(tk);
  }, []);

  useEffect(() => {
    // Detectar token de reset en la URL (ej: /reset-password/TOKEN)
    const pathname = window.location.pathname;
    if (pathname.includes('/reset-password/')) {
      const token = pathname.split('/reset-password/')[1];
      if (token) {
        setResetToken(token);
      }
    }
    
    // También buscar en query parameters por si acaso
    const params = new URLSearchParams(window.location.search);
    const resetTokenFromUrl = params.get('reset');
    if (resetTokenFromUrl) {
      setResetToken(resetTokenFromUrl);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.usuario.rol !== 'ADMINISTRADOR') {
        alert('Tu cuenta no tiene permisos de administrador.');
        return;
      }
      setToken(res.data.token);
      localStorage.setItem('admin_token', res.data.token);
    } catch (err) {
      alert(err.response?.data?.error || 'Error de autenticación.');
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('admin_token');
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/reportes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data.reportes || []);
    } catch {
      alert('Sesión expirada.');
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchReports(); }, [token]);

  const executeAction = async () => {
    if (!confirmModal) return;
    const { tipo, userId, reportId } = confirmModal;
    setActionLoading(true);
    try {
      if (tipo === 'SUSPENSION') {
        await api.put(`/admin/usuarios/${userId}/suspender`, {}, { headers: { Authorization: `Bearer ${token}` } });
        await api.put(`/admin/reportes/${reportId}/resolver`, { nuevo_estado: 'RESUELTO', resolucion_admin: 'SUSPENSION' }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await api.put(`/admin/reportes/${reportId}/resolver`, { nuevo_estado: 'RESUELTO', resolucion_admin: 'ADVERTENCIA' }, { headers: { Authorization: `Bearer ${token}` } });
      }
      fetchReports();
      setConfirmModal(null);
    } catch {
      alert('Error al procesar la acción.');
    } finally {
      setActionLoading(false);
    }
  };

  const abiertos   = reports.filter(r => r.estado === 'ABIERTO').length;
  const resueltos  = reports.filter(r => r.estado === 'RESUELTO').length;
  const total      = reports.length;

  // ── LOGIN ──────────────────────────────────────────────────────────────
  if (!token) {
    if (resetToken) {
      return <ResetPasswordPage token={resetToken} onBack={() => {
        setResetToken(null);
        window.history.replaceState({}, document.title, '/');
      }} />;
    }
    if (showForgotPassword) {
      return <ForgotPasswordPage onBack={() => setShowForgotPassword(false)} />;
    }
    return (
      <div className="login-screen">
        <div className="login-blob1" />
        <div className="login-blob2" />
        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo">
              <CarFront size={26} color="white" />
            </div>
            <span className="login-app-name">U-Ride</span>
          </div>
          <p className="login-subtitle">Panel de Administración · RF11</p>
          <h2 className="login-title">Iniciar Sesión</h2>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Correo Administrativo</label>
              <div className="input-wrapper">
                <Mail size={18} />
                <input type="email" placeholder="admin@uta.edu.ec" value={email}
                  onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Contraseña</label>
              <div className="input-wrapper">
                <Lock size={18} />
                <input type="password" placeholder="Contraseña" value={password}
                  onChange={e => setPassword(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
              {loginLoading ? <span className="spinner" /> : (
                <>
                  <ShieldCheck size={18} />
                  Acceder al Panel
                </>
              )}
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={() => setShowForgotPassword(true)}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──────────────────────────────────────────────────────────
  return (
    <div className="app-wrapper">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <CarFront size={22} color="white" />
          </div>
          <div>
            <div className="topbar-title">U-Ride Admin</div>
            <div className="topbar-sub">Panel de Administración · RF11</div>
          </div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost btn-sm" onClick={fetchReports}>
            <RefreshCw size={14} />
            Actualizar
          </button>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            <LogOut size={14} />
            Salir
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Gestión de Reportes</h1>
          <p className="page-sub">Revisa, resuelve y aplica acciones disciplinarias sobre los reportes de la comunidad.</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon warning"><AlertTriangle size={22} /></div>
            <div>
              <div className="stat-value">{abiertos}</div>
              <div className="stat-label">Reportes Abiertos</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success"><CheckCircle size={22} /></div>
            <div>
              <div className="stat-value">{resueltos}</div>
              <div className="stat-label">Resueltos</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon primary"><FileText size={22} /></div>
            <div>
              <div className="stat-value">{total}</div>
              <div className="stat-label">Total Reportes</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon primary"><Users size={22} /></div>
            <div>
              <div className="stat-value">{new Set(reports.map(r => r.persona_denunciada_id)).size}</div>
              <div className="stat-label">Usuarios Involucrados</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <Flag size={18} color="var(--primary)" />
              Registro de Reportes
            </div>
            <button className="refresh-btn" onClick={fetchReports} title="Refrescar">
              <RefreshCw size={15} />
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)', width: 32, height: 32 }} />
              </div>
              <p className="empty-sub" style={{ marginTop: 16 }}>Cargando datos...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={56} color="var(--border)" />
              <p className="empty-title">Sin reportes pendientes</p>
              <p className="empty-sub">La comunidad U-Ride se está comportando correctamente.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Denunciante</th>
                  <th>Denunciado</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => {
                  const isExpanded = expandedId === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        onClick={() => toggleExpand(r.id)}
                        style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'var(--primary-lt)' : undefined, transition: 'background 0.2s' }}
                      >
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>#{r.id}</td>
                        <td style={{ color: 'var(--gray)', fontSize: 13 }}>
                          {new Date(r.creado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                              {r.autor_denuncia?.charAt(0) ?? '?'}
                            </div>
                            {r.autor_denuncia}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--danger-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>
                              {r.persona_denunciada?.charAt(0) ?? '?'}
                            </div>
                            <strong>{r.persona_denunciada}</strong>
                          </div>
                        </td>
                        <td className="motivo-cell">
                          <span className="motivo-text" title={r.motivo}>{r.motivo}</span>
                        </td>
                        <td>
                          <span className={`badge ${r.estado.toLowerCase()}`}>
                            {r.estado === 'ABIERTO' ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
                            {r.estado}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {r.estado === 'ABIERTO' ? (
                              <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                                <button className="btn btn-sm" style={{ backgroundColor: '#F59E0B', color: '#fff', padding: '6px 10px', fontSize: 12, border: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={() => openModal('ADVERTENCIA', r.persona_denunciada_id, r.id, r.persona_denunciada)}>
                                  <AlertTriangle size={14} />
                                  Advertir
                                </button>
                                <button className="btn btn-danger btn-sm" style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => openModal('SUSPENSION', r.persona_denunciada_id, r.id, r.persona_denunciada)}>
                                  <Ban size={14} />
                                  Suspender
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted">
                                <CheckSquare size={14} />
                                Resuelto
                              </span>
                            )}
                            {isExpanded ? <ChevronUp size={16} color="var(--primary)" /> : <ChevronDown size={16} color="var(--gray)" />}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ backgroundColor: '#F8FAFF' }}>
                          <td colSpan={7} style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Denunciante</p>
                                <p style={{ fontWeight: 600 }}>{r.autor_denuncia}</p>
                              </div>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Denunciado</p>
                                <p style={{ fontWeight: 600, color: 'var(--danger)' }}>{r.persona_denunciada}</p>
                              </div>
                              <div style={{ gridColumn: '1 / -1' }}>
                                <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Motivo Completo</p>
                                <p style={{ lineHeight: 1.6, color: 'var(--dark)', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>{r.motivo}</p>
                              </div>
                              {r.evidencia_url && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 8 }}>Evidencia Adjunta</p>
                                  <a href={`http://localhost:5000${r.evidencia_url}`} target="_blank" rel="noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--primary)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                                    Ver Evidencia
                                  </a>
                                </div>
                              )}
                              <div>
                                <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Fecha del Reporte</p>
                                <p>{new Date(r.creado_en).toLocaleString('es-EC')}</p>
                              </div>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Resolución Aplicada</p>
                                <p style={{ fontWeight: 600, color: r.resolucion_admin === 'SUSPENSION' ? 'var(--danger)' : r.resolucion_admin === 'ADVERTENCIA' ? '#D97706' : 'var(--gray)' }}>
                                  {r.resolucion_admin ?? 'Sin resolución aún'}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modal de Confirmacion de Acciones Admin */}
      {confirmModal && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', position: 'relative' }}>
            <button onClick={closeModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: confirmModal.tipo === 'SUSPENSION' ? '#FEF2F2' : '#FFFBEB' }}>
                {confirmModal.tipo === 'SUSPENSION' ? <Ban size={24} color="var(--danger)" /> : <AlertTriangle size={24} color="#D97706" />}
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 18, color: 'var(--dark)', margin: 0 }}>
                  {confirmModal.tipo === 'SUSPENSION' ? 'Suspender Usuario' : 'Enviar Advertencia'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--gray)', margin: '2px 0 0' }}>Acción administrativa — RF11</p>
              </div>
            </div>
            <p style={{ color: 'var(--dark)', lineHeight: 1.6, marginBottom: 24, background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', fontSize: 14 }}>
              {confirmModal.tipo === 'SUSPENSION'
                ? <><strong>¿Suspender la cuenta de {confirmModal.nombre}?</strong><br />El usuario perderá la capacidad de publicar viajes y solicitar cupos. Se le notificará con el motivo del reporte.</>  
                : <><strong>¿Enviar advertencia formal a {confirmModal.nombre}?</strong><br />El reporte se marcará como resuelto y el usuario recibirá un aviso en su bandeja de solicitudes.</>}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeModal} disabled={actionLoading} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fff', fontWeight: 600, cursor: 'pointer', color: 'var(--gray)' }}>
                Cancelar
              </button>
              <button onClick={executeAction} disabled={actionLoading} style={{ flex: 1.5, padding: '12px', borderRadius: 10, border: 'none', background: confirmModal.tipo === 'SUSPENSION' ? 'var(--danger)' : '#D97706', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {actionLoading ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : (
                  <>{confirmModal.tipo === 'SUSPENSION' ? <Ban size={16} /> : <AlertTriangle size={16} />} Confirmar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
