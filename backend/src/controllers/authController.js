const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const nodemailer = require('nodemailer');

/**
 * RF1: Registro de Usuarios
 * Validación Estricta: @uta.edu.ec
 */
exports.register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    // 1. Validaciones básicas de entrada
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // 2. Validación de Dominio (REGLA ACADÉMICA UTA)
    if (!email.trim().endsWith('@uta.edu.ec')) {
      return res.status(403).json({ 
        error: 'Pertenencia Institucional Inválida. El correo debe terminar en @uta.edu.ec' 
      });
    }

    // 3. Comprobar si el usuario/correo ya existe
    const verifySQL = 'SELECT id FROM usuarios WHERE email = $1';
    const existingUser = await pool.query(verifySQL, [email.trim()]);
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'El correo institucional ya está registrado en U-Ride' });
    }

    // 4. Cifrado de Contraseña (RNF1 de Seguridad)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 5. Insertar Transaccional en Base de Datos Postgres
    const insertSQL = `
      INSERT INTO usuarios (nombre, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, nombre, email, rol
    `;
    const result = await pool.query(insertSQL, [nombre.trim(), email.trim(), passwordHash]);

    // 6. Retorno Exitoso
    return res.status(201).json({
      message: 'Estudiante registrado correctamente en U-Ride',
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error('Error Crítico en Controlador de Registro:', error);
    return res.status(500).json({ error: 'Error del servidor procesando tu solicitud' });
  }
};

/**
 * RF1 & RNF1: Inicio de Sesión Seguro
 * Validación bcrypt y Emisión de JWT
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan credenciales obligatorias' });
    }

    // 1. Buscar Estudiante
    const searchSQL = 'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = $1';
    const result = await pool.query(searchSQL, [email.trim()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas o cuenta deshabilitada' });
    }

    const usuario = result.rows[0];

    // 2. Verificar Contraseña Cifrada (Bcrypt)
    const isValid = await bcrypt.compare(password, usuario.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // 3. Generar JWT (Payload incluye id y rol)
    const payload = {
      id: usuario.id,
      rol: usuario.rol
    };

    // Firmar Token usando variable .env (1 día expira loggeado)
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'llave_secreta_default', { expiresIn: '24h' });

    // 4. Retorno Seguro
    return res.status(200).json({
      message: 'Inicio de Sesión Exitoso',
      token: token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo
      }
    });

  } catch (error) {
    console.error('Error Crítico en Controlador de Login:', error);
    return res.status(500).json({ error: 'Error del Servidor conectando sesión' });
  }
};

/**
 * RF: Recuperación de Contraseña - Paso 1
 * Envía OTP al correo del usuario
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'El correo es obligatorio' });
    }

    // 1. Verificar que el usuario exista
    const searchSQL = 'SELECT id, nombre, email FROM usuarios WHERE email = $1';
    const result = await pool.query(searchSQL, [email.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'El correo no está registrado en U-Ride' });
    }

    const usuario = result.rows[0];

    // 2. Generar OTP de 6 dígitos
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60000); // Válido 15 minutos

    // 3. Guardar OTP en base de datos
    const updateSQL = `
      UPDATE usuarios 
      SET reset_otp = $1, reset_otp_expires = $2
      WHERE id = $3
    `;
    await pool.query(updateSQL, [otp, otpExpires, usuario.id]);

    // 4. Enviar correo con Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD
      }
    });

    const resetLink = `http://localhost:5173/?token=${otp}&email=${email}`;

    const mailOptions = {
      from: '"U-Ride Admin" <no-reply@u-ride.com>',
      to: email,
      subject: 'Recuperación de Contraseña - U-Ride',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #f8fafc;">
          <h2 style="color: #0f172a; text-align: center;">Recuperación de Contraseña</h2>
          <p style="color: #475569; font-size: 16px;">Hola,</p>
          <p style="color: #475569; font-size: 16px;">Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para asignar una nueva:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Restablecer mi contraseña
            </a>
          </div>
          <p style="color: #475569; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #475569; font-size: 14px; text-align: center;">El equipo de U-Ride.</p>
        </div>
      `
    };

    let debugUrl = '';
    try {
      const info = await transporter.sendMail(mailOptions);
      debugUrl = nodemailer.getTestMessageUrl(info) || resetLink;
      console.log(`[DEV] Correo enviado a ${email}. URL: ${debugUrl}`);
    } catch (mailError) {
      console.error('Error enviando correo con Nodemailer:', mailError);
      debugUrl = resetLink;
      console.log(`[DEV] Fallback enlace: ${debugUrl}`);
    }

    return res.status(200).json({
      message: 'Se envió un enlace de recuperación a tu correo',
      debug_url: debugUrl
    });

  } catch (error) {
    console.error('Error en Recuperación de Contraseña:', error);
    return res.status(500).json({ error: 'Error del servidor procesando tu solicitud' });
  }
};

/**
 * RF: Recuperación de Contraseña - Paso 2
 * Verifica OTP y actualiza la contraseña
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // 1. Buscar usuario y verificar OTP
    const searchSQL = `
      SELECT id, reset_otp, reset_otp_expires 
      FROM usuarios 
      WHERE email = $1
    `;
    const result = await pool.query(searchSQL, [email.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = result.rows[0];

    // 2. Verificar OTP válido y no expirado
    if (usuario.reset_otp !== otp.trim()) {
      return res.status(400).json({ error: 'El código OTP es incorrecto' });
    }

    if (new Date() > new Date(usuario.reset_otp_expires)) {
      return res.status(400).json({ error: 'El código OTP ha expirado. Solicita uno nuevo.' });
    }

    // 3. Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // 4. Actualizar contraseña y limpiar OTP
    const updateSQL = `
      UPDATE usuarios 
      SET password_hash = $1, reset_otp = NULL, reset_otp_expires = NULL
      WHERE id = $2
    `;
    await pool.query(updateSQL, [passwordHash, usuario.id]);

    return res.status(200).json({
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al Resetear Contraseña:', error);
    return res.status(500).json({ error: 'Error del servidor procesando tu solicitud' });
  }
};
