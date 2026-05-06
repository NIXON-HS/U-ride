/**
 * 🔐 PASSWORD ROUTES
 * Rutas para recuperación de contraseña
 */

const express = require('express');
const router = express.Router();
const passwordController = require('../controllers/passwordController');

// Solicitar reset de contraseña (sin autenticación)
router.post('/forgot-password', passwordController.requestPasswordReset);

// Resetear contraseña con token
router.post('/reset-password', passwordController.resetPassword);

// Validar token de reset
router.get('/validate-reset-token/:token', passwordController.validateResetToken);

module.exports = router;
