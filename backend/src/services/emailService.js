const nodemailer = require('nodemailer');

// Configuración del transportador SMTP usando las variables de entorno
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Envía un correo con el código de verificación para el registro.
 * @param {string} toEmail Correo del destinatario.
 * @param {string} code Código de verificación de 6 dígitos.
 * @param {string} userName Nombre del usuario.
 */
const sendVerificationCode = async (toEmail, code, userName) => {
  try {
    const mailOptions = {
      from: `"U-Ride Soporte" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: 'Tu Código de Verificación en U-Ride',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #2563EB; text-align: center;">¡Bienvenido a U-Ride, ${userName}!</h2>
          <p style="font-size: 16px; color: #333;">Gracias por registrarte. Para completar tu creación de cuenta y unirte a la red de transporte universitario, por favor ingresa el siguiente código de verificación en la aplicación:</p>
          
          <div style="background-color: #F1F5F9; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0F172A;">${code}</span>
          </div>
          
          <p style="font-size: 14px; color: #666;">Este código expirará en 15 minutos.</p>
          <p style="font-size: 14px; color: #666;">Si no solicitaste este registro, puedes ignorar este correo.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">© 2026 U-Ride. Todos los derechos reservados.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Correo de verificación enviado a ${toEmail}`);
  } catch (error) {
    console.error('Error enviando correo de verificación:', error);
    throw new Error('No se pudo enviar el correo de verificación.');
  }
};

/**
 * Envía un correo con el código para recuperar la contraseña.
 * @param {string} toEmail Correo del destinatario.
 * @param {string} code Código de verificación de 6 dígitos.
 * @param {string} userName Nombre del usuario.
 */
const sendPasswordRecoveryCode = async (toEmail, code, userName) => {
  try {
    const mailOptions = {
      from: `"U-Ride Soporte" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: 'Recuperación de Contraseña - U-Ride',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #2563EB; text-align: center;">Hola, ${userName}</h2>
          <p style="font-size: 16px; color: #333;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de U-Ride. Por favor, usa el siguiente código de seguridad en la aplicación para crear tu nueva contraseña:</p>
          
          <div style="background-color: #F1F5F9; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0F172A;">${code}</span>
          </div>
          
          <p style="font-size: 14px; color: #666;">Este código expirará en 15 minutos.</p>
          <p style="font-size: 14px; color: #666;">Si no solicitaste un cambio de contraseña, por favor ignora este correo. Tu cuenta está segura.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">© 2026 U-Ride. Todos los derechos reservados.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Correo de recuperación enviado a ${toEmail}`);
  } catch (error) {
    console.error('Error enviando correo de recuperación:', error);
    throw new Error('No se pudo enviar el correo de recuperación.');
  }
};

module.exports = {
  sendVerificationCode,
  sendPasswordRecoveryCode,
};
