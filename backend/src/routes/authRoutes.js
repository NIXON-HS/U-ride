const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// [POST] /api/auth/register -> Crea un estudiante validado en la base (Paso 1: envia código)
router.post('/register', authController.register);

// [POST] /api/auth/verify-register -> Verifica código y completa el registro
router.post('/verify-register', authController.verifyRegister);

// [POST] /api/auth/login -> Inicia sesión cifradamente y devuelve JWT
router.post('/login', authController.login);

// [POST] /api/auth/forgot-password -> Solicita recuperación de contraseña
router.post('/forgot-password', authController.forgotPassword);

// [POST] /api/auth/reset-password -> Restablece la contraseña con código
router.post('/reset-password', authController.resetPassword);

module.exports = router;
