/**
 * ⚙️ CONFIGURACIÓN DE JEST
 * Para ejecutar las pruebas unitarias del módulo LOGIN
 */

module.exports = {
  // Entorno de prueba
  testEnvironment: 'node',

  // Patrón para encontrar archivos de prueba
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],

  // Cobertura de pruebas
  collectCoverage: true,
  collectCoverageFrom: [
    'backend/src/controllers/authController.js',
    'backend/src/middlewares/authMiddleware.js',
    '!backend/src/**/*.test.js',
  ],

  // Umbrales de cobertura
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 100,
      lines: 80,
      statements: 80,
    },
  },

  // Directorios para reporte de cobertura
  coverageDirectory: '<rootDir>/pruebas unitarias/coverage',
  coverageReporters: ['text', 'lcov', 'json', 'html'],

  // Setupfiles
  setupFilesAfterEnv: ['<rootDir>/pruebas unitarias/jest.setup.js'],

  // Timeout de pruebas
  testTimeout: 10000,

  // Módulos a ignorar
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],

  // Verbose output
  verbose: true,
};
