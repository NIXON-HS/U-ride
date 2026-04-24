const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middlewares/authMiddleware');

// RF8 & BK-9: Enviar Reseña de Viaje (Y detonar recalculo matematico de Score)
router.post('/calificaciones', authMiddleware, reviewController.createReview);

module.exports = router;
