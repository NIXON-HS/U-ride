import React, { useState } from 'react';
import axios from 'axios';
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import './styles/ForgotPassword.css';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

export default function ResetPasswordPage({ token, onBack }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [step, setStep] = useState('reset'); // 'reset' o 'success'

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!newPassword.trim()) {
      setError('Por favor ingresa una nueva contraseña');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    // Validar fuerza de contraseña
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('Mínimo 8 caracteres, 1 mayúscula y 1 número');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword,
        confirmPassword,
      });
      setSuccessMessage(res.data.message);
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  // Paso de Reset
  if (step === 'reset') {
    return (
      <div className="forgot-password-container">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} /> Volver
        </button>

        <div className="forgot-password-card">
          <h2>Establecer Nueva Contraseña</h2>
          <p className="subtitle">Ingresa tu nueva contraseña para recuperar acceso</p>

          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>Nueva Contraseña</label>
              <div className="input-wrapper">
                <Lock size={18} />
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Confirmar Contraseña</label>
              <div className="input-wrapper">
                <Lock size={18} />
                <input
                  type="password"
                  placeholder="Confirma tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? '⏳ Actualizando...' : '🔐 Cambiar Contraseña'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Paso de Éxito
  if (step === 'success') {
    return (
      <div className="forgot-password-container">
        <div className="forgot-password-card success">
          <CheckCircle size={64} style={{ color: '#10b981', marginBottom: 20 }} />
          <h2>¡Contraseña Actualizada!</h2>
          <p className="subtitle">{successMessage}</p>
          <button onClick={onBack} className="btn btn-primary" style={{ width: '100%' }}>
            ← Volver a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }
}
