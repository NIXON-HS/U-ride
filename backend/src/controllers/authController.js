const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

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
