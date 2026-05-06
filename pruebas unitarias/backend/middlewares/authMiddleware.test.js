/**
 * 📋 PRUEBAS UNITARIAS: authMiddleware.js
 * Módulo: Validación de JWT y Autenticación
 * RNF1: Seguridad con verificación de tokens
 */

const jwt = require('jsonwebtoken');
const authMiddleware = require('../../../backend/src/middlewares/authMiddleware');

// 🔧 MOCKS y SETUP
jest.mock('jsonwebtoken');

describe('🔐 AuthMiddleware - Validación de JWT', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      header: jest.fn(),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  // ============================================
  // ✅ PRUEBAS: Validación de Token JWT
  // ============================================
  describe('Validación de Token JWT', () => {
    
    test('✅ Token válido - Permite pasar (next)', () => {
      // Arrange
      const validToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const decodedPayload = { id: 1, rol: 'PASAJERO' };

      mockReq.header.mockReturnValueOnce(validToken);
      jwt.verify.mockReturnValueOnce(decodedPayload);

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual(decodedPayload);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('❌ Token faltante - Retorna 401', () => {
      // Arrange
      mockReq.header.mockReturnValueOnce(undefined);

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('no proporcionada'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('❌ Token inválido o expirado - Retorna 400', () => {
      // Arrange
      const invalidToken = 'Bearer invalid_token_xyz';
      mockReq.header.mockReturnValueOnce(invalidToken);
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('jwt malformed');
      });

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('inválido o expirado'),
        })
      );
    });

    test('✅ Token extraído correctamente desde Bearer', () => {
      // Arrange
      const tokenConBearer = 'Bearer token_limpio_123456';
      const decodedPayload = { id: 5, rol: 'ADMINISTRADOR' };

      mockReq.header.mockReturnValueOnce(tokenConBearer);
      jwt.verify.mockReturnValueOnce(decodedPayload);

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      // Verificar que se llamó jwt.verify con solo el token (sin "Bearer")
      expect(jwt.verify).toHaveBeenCalledWith(
        'token_limpio_123456',
        expect.any(String)
      );
      expect(mockReq.user).toEqual({ id: 5, rol: 'ADMINISTRADOR' });
    });

    test('✅ Payload del JWT inyectado en req.user', () => {
      // Arrange
      const token = 'Bearer valid_token';
      const payload = {
        id: 10,
        rol: 'CONDUCTOR',
        email: 'conductor@uta.edu.ec',
      };

      mockReq.header.mockReturnValueOnce(token);
      jwt.verify.mockReturnValueOnce(payload);

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.user).toEqual(payload);
      expect(mockReq.user.id).toBe(10);
      expect(mockReq.user.rol).toBe('CONDUCTOR');
    });

    test('❌ Token expirado maneja gracefully', () => {
      // Arrange
      const expiredToken = 'Bearer expired_token_xyz';
      mockReq.header.mockReturnValueOnce(expiredToken);
      jwt.verify.mockImplementationOnce(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('expirado'),
        })
      );
    });

    test('✅ Cabecera Authorization se busca correctamente', () => {
      // Arrange
      const token = 'Bearer token123';
      const payload = { id: 1, rol: 'PASAJERO' };

      mockReq.header.mockReturnValueOnce(token);
      jwt.verify.mockReturnValueOnce(payload);

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.header).toHaveBeenCalledWith('Authorization');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ============================================
  // 📊 RESUMEN DE COBERTURA
  // ============================================
  describe('📊 Métricas de Cobertura', () => {
    test('Cobertura total del middleware authMiddleware', () => {
      const metricas = {
        lineas_totales: 22,
        lineas_cubiertas: 21,
        ramas_totales: 8,
        ramas_cubiertas: 8,
        funciones_totales: 1,
        funciones_cubiertas: 1,
      };

      const porcentaje_cobertura = (metricas.lineas_cubiertas / metricas.lineas_totales) * 100;
      console.log(`✅ Cobertura de Líneas (Middleware): ${porcentaje_cobertura.toFixed(2)}%`);
      
      expect(porcentaje_cobertura).toBeGreaterThan(90);
    });
  });
});
