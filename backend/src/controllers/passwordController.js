/**
 * 🔐 PASSWORD CONTROLLER
 * Funcionalidad: Recuperación de Contraseña con Gmail
 * Métodos: Solicitar reset, validar token, cambiar contraseña
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool = require('../config/database');

// 📧 CONFIGURAR TRANSPORTE GMAIL
const transporter = nodemailer.createTransport({
  host: process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_EMAIL || 'uride-support@gmail.com',
    pass: process.env.GMAIL_PASSWORD || 'application-password',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * RF12: Solicitar Reset de Contraseña
 * POST /auth/forgot-password
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Validar que el email fue proporcionado
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'El email es obligatorio' });
    }

    // 2. Buscar usuario por email
    const querySQL = 'SELECT id, nombre, email FROM usuarios WHERE email = $1';
    const result = await pool.query(querySQL, [email.trim()]);

    if (result.rows.length === 0) {
      // No revelar si el email existe por seguridad
      return res.status(200).json({
        message: 'Si el email existe, recibirá un enlace de recuperación',
      });
    }

    const usuario = result.rows[0];

    // 3. Generar token de reset (válido por 1 hora)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // 4. Guardar token hasheado en BD
    const updateSQL = `
      UPDATE usuarios 
      SET password_reset_token = $1, password_reset_expiry = $2
      WHERE id = $3
    `;
    await pool.query(updateSQL, [hashedToken, tokenExpiry, usuario.id]);

    // 5. Construir URL del reset
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    const mobileResetURL = `${process.env.MOBILE_URL || 'exp://localhost:8081'}/reset-password/${resetToken}`;

    // 6. Contenido del email
    const htmlContent = `
      <h2>Recuperación de Contraseña - U-Ride</h2>
      <p>Hola ${usuario.nombre},</p>
      <p>Recibimos una solicitud para recuperar tu contraseña. Haz clic en el enlace de abajo para establecer una nueva contraseña:</p>
      
      <p><a href="${resetURL}" style="background-color: #4169E1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        🔐 Recuperar Contraseña
      </a></p>
      
      <p style="margin-top: 20px; font-size: 12px; color: #666;">Este enlace expirará en 1 hora.</p>
      <p style="font-size: 12px; color: #666;">Si no solicitaste esto, ignora este email.</p>
      <p style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px; font-size: 12px; color: #999;">U-Ride Support Team</p>
    `;

    // 7. Enviar email
    await transporter.sendMail({
      from: process.env.GMAIL_EMAIL || 'uride-support@gmail.com',
      to: usuario.email,
      subject: '🔐 Recuperación de Contraseña - U-Ride',
      html: htmlContent,
    });

    console.log(`✅ Email de recuperación enviado a ${usuario.email}`);

    return res.status(200).json({
      message: 'Se ha enviado un enlace de recuperación a tu correo. Por favor revisa tu bandeja de entrada.',
    });
  } catch (error) {
    console.error('❌ Error en requestPasswordReset:', error);
    return res
      .status(500)
      .json({ error: 'Error al procesar la solicitud de recuperación' });
  }
};

/**
 * RF12: Validar Token y Cambiar Contraseña
 * POST /auth/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // 1. Validar campos obligatorios
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'Token, contraseña nueva y confirmación son obligatorios',
      });
    }

    // 2. Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'Las contraseñas no coinciden',
      });
    }

    // 3. Validar fuerza de contraseña (mínimo 8 caracteres, 1 mayúscula, 1 número)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error:
          'Contraseña débil. Mínimo 8 caracteres, 1 mayúscula y 1 número',
      });
    }

    // 4. Hashear el token para buscar en BD
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // 5. Buscar usuario con token válido y no expirado
    const querySQL = `
      SELECT id, email FROM usuarios 
      WHERE password_reset_token = $1 
      AND password_reset_expiry > NOW()
    `;
    const result = await pool.query(querySQL, [hashedToken]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Token inválido o expirado. Solicita un nuevo reset',
      });
    }

    const usuario = result.rows[0];

    // 6. Hashear nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // 7. Actualizar contraseña y limpiar tokens
    const updateSQL = `
      UPDATE usuarios 
      SET password_hash = $1, 
          password_reset_token = NULL,
          password_reset_expiry = NULL
      WHERE id = $2
    `;
    await pool.query(updateSQL, [newPasswordHash, usuario.id]);

    // 8. Log de evento
    await pool.query(
      "INSERT INTO logs_eventos (usuario_id, tipo_evento, detalles) VALUES ($1, $2, $3)",
      [usuario.id, 'PASSWORD_RESET', JSON.stringify({ email: usuario.email })]
    );

    console.log(`✅ Contraseña reseteada exitosamente para ${usuario.email}`);

    return res.status(200).json({
      message: 'Contraseña actualizada exitosamente. Inicia sesión con tu nueva contraseña',
    });
  } catch (error) {
    console.error('❌ Error en resetPassword:', error);
    return res.status(500).json({ error: 'Error al resetear la contraseña' });
  }
};

/**
 * RF12: Validar Token (Verificar si es válido sin cambiar contraseña)
 * GET /auth/validate-reset-token/:token
 */
exports.validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    // Hashear el token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Buscar usuario con token válido
    const querySQL = `
      SELECT id, email FROM usuarios 
      WHERE password_reset_token = $1 
      AND password_reset_expiry > NOW()
    `;
    const result = await pool.query(querySQL, [hashedToken]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        valid: false,
        error: 'Token inválido o expirado',
      });
    }

    return res.status(200).json({
      valid: true,
      message: 'Token válido. Procede a cambiar tu contraseña',
    });
  } catch (error) {
    console.error('❌ Error en validateResetToken:', error);
    return res
      .status(500)
      .json({ error: 'Error validando el token de reset' });
  }
};
