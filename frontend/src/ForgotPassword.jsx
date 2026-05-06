import React, { useState } from 'react';
import axios from 'axios';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import './styles/ForgotPassword.css';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

export default function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [step, setStep] = useState('request'); // 'request' o 'sent'

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSuccessMessage(res.data.message);
      setStep('sent');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al solicitar recuperación de contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'request') {
    return (
      <div className="forgot-password-container">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} /> Volver
        </button>

        <div className="forgot-password-card">
          <h2>Recuperar Contraseña</h2>
          <p className="subtitle">
            Ingresa tu email para recibir un enlace de recuperación
          </p>

          <form onSubmit={handleRequestReset}>
            <div className="form-group">
              <label>Email Administrativo</label>
              <div className="input-wrapper">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="admin@uta.edu.ec"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              {loading ? '⏳ Enviando...' : '📧 Enviar Enlace de Recuperación'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Mensaje de envío exitoso
  if (step === 'sent') {
    return (
      <div className="forgot-password-container">
        <div className="forgot-password-card success">
          <CheckCircle size={64} style={{ color: '#10b981', marginBottom: 20 }} />
          <h2>¡Enlace Enviado!</h2>
          <p className="subtitle">Hemos enviado un enlace de recuperación a {email}. Abre tu correo y sigue las instrucciones.</p>
          <button onClick={onBack} className="btn btn-primary" style={{ width: '100%' }}>
            ← Volver a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }
}
