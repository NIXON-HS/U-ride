const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// [POST] /api/auth/register -> Crea un estudiante validado en la base
router.post('/register', authController.register);

// [POST] /api/auth/login -> Inicia sesión cifradamente y devuelve JWT
router.post('/login', authController.login);

module.exports = router;
