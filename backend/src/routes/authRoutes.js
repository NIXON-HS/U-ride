const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// [POST] /api/auth/register -> Crea un estudiante validado en la base
router.post('/register', authController.register);

// [POST] /api/auth/login -> Inicia sesión cifradamente y devuelve JWT
router.post('/login', authController.login);

// [POST] /api/auth/forgot-password -> Envía OTP para recuperación de contraseña
router.post('/forgot-password', authController.forgotPassword);

// [POST] /api/auth/reset-password -> Verifica OTP y actualiza contraseña
router.post('/reset-password', authController.resetPassword);

module.exports = router;
