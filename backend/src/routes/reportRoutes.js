const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');

// Configuración de Multer orientada a guardar "Evidencias Multimedia" de reportes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/evidencias/'));
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    cb(null, 'ticket-' + req.user.id + '-' + timestamp + path.extname(file.originalname));
  }
});

const uploadEvidence = multer({ 
    storage: storage,
    limits: { fileSize: 8000000 }, // Máximo 8 MB por evidencia
});

// RF10: Subir Ticket de Reporte (Con evidencia multimedia opcional)
router.post('/reportes', authMiddleware, uploadEvidence.single('evidencia'), reportController.createReport);

// Obtener Infracciones del Usuario (Para mostrar memos administrativos)
router.get('/reportes/infracciones', authMiddleware, reportController.getInfracciones);

module.exports = router;
