require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas base
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'U-Ride API Running' });
});

// Importar rutas próximas...
// const authRoutes = require('./routes/auth');
// app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
      console.log(`🚀 U-Ride Server is running on port ${PORT}`);
  });
}

module.exports = app; // Exportado para Supertest
