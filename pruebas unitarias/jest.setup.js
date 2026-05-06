/**
 * 🛠️ SETUP INICIAL PARA JEST
 * Configuración antes de ejecutar las pruebas
 */

// Silenciar logs de console durante pruebas (opcional)
global.console = {
  ...console,
  // Descomenta para silenciar logs
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: console.error, // Mantener errores visibles
};

// Variables de entorno para testing
process.env.JWT_SECRET = 'test_secret_key_123';
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'uride_test';

console.log('✅ Jest Setup completado para testing');
