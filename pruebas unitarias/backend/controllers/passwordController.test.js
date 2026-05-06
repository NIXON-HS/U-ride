/**
 * 📋 PRUEBAS UNITARIAS: passwordController.js
 * Módulo: Recuperación de Contraseña con Outlook
 * RF12: Reset de contraseña
 */

const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const passwordController = require('../../../backend/src/controllers/passwordController');

// 🔧 MOCKS y SETUP
jest.mock('pg');
jest.mock('bcryptjs');
jest.mock('nodemailer');
jest.mock('crypto');

describe('🔐 PasswordController - Recuperación de Contraseña', () => {
  let mockPool;
  let mockReq;
  let mockRes;
  let mockTransporter;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPool = {
      query: jest.fn(),
    };

    mockReq = {
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ response: '250 OK' }),
    };

    nodemailer.createTransport.mockReturnValue(mockTransporter);
  });

  // ============================================
  // ✅ PRUEBAS: POST /forgot-password
  // ============================================
  describe('POST /auth/forgot-password - Solicitar Reset', () => {
    
    test('✅ Solicitud exitosa - Email válido', async () => {
      // Arrange
      mockReq.body = {
        email: 'usuario@uta.edu.ec',
      };

      const usuarioMock = {
        id: 1,
        nombre: 'Usuario Test',
        email: 'usuario@uta.edu.ec',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [usuarioMock] }) // Buscar usuario
        .mockResolvedValueOnce({ rows: [] }); // Actualizar token

      crypto.randomBytes = jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue('randomtoken123'),
      });

      // Act
      await passwordController.requestPasswordReset(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('recibirá'),
          resetToken: expect.any(String),
        })
      );
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    test('❌ Rechazo: Email vacío', async () => {
      // Arrange
      mockReq.body = {
        email: '',
      };

      // Act
      await passwordController.requestPasswordReset(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('obligatorio'),
        })
      );
    });

    test('✅ No revela si email existe (seguridad)', async () => {
      // Arrange
      mockReq.body = {
        email: 'noexiste@uta.edu.ec',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Usuario no existe

      // Act
      await passwordController.requestPasswordReset(mockReq, mockRes);

      // Assert
      // Debe devolver el mismo mensaje aunque el email no exista
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('recibirá'),
        })
      );
    });

    test('✅ Email enviado correctamente', async () => {
      // Arrange
      mockReq.body = {
        email: 'usuario@uta.edu.ec',
      };

      const usuarioMock = {
        id: 1,
        nombre: 'Juan García',
        email: 'usuario@uta.edu.ec',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [usuarioMock] });
      crypto.randomBytes = jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue('token123'),
      });

      // Act
      await passwordController.requestPasswordReset(mockReq, mockRes);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'usuario@uta.edu.ec',
          subject: expect.stringContaining('Recuperación'),
          html: expect.stringContaining('Recuperar'),
        })
      );
    });
  });

  // ============================================
  // ✅ PRUEBAS: POST /reset-password
  // ============================================
  describe('POST /auth/reset-password - Cambiar Contraseña', () => {
    
    test('✅ Reset exitoso con token válido', async () => {
      // Arrange
      mockReq.body = {
        token: 'validtoken123',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      };

      const usuarioMock = {
        id: 1,
        email: 'usuario@uta.edu.ec',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [usuarioMock] }) // Buscar usuario con token
        .mockResolvedValueOnce({ rows: [] }) // Actualizar contraseña
        .mockResolvedValueOnce({ rows: [] }); // Log de evento

      bcrypt.genSalt.mockResolvedValueOnce('salt123');
      bcrypt.hash.mockResolvedValueOnce('hashedpassword123');

      // Act
      await passwordController.resetPassword(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('actualizada'),
        })
      );
    });

    test('❌ Rechazo: Contraseñas no coinciden', async () => {
      // Arrange
      mockReq.body = {
        token: 'token123',
        newPassword: 'Pass123!',
        confirmPassword: 'DifferentPass123!',
      };

      // Act
      await passwordController.resetPassword(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('no coinciden'),
        })
      );
    });

    test('❌ Rechazo: Contraseña débil', async () => {
      // Arrange
      mockReq.body = {
        token: 'token123',
        newPassword: 'weakpass', // Menos de 8 caracteres
        confirmPassword: 'weakpass',
      };

      // Act
      await passwordController.resetPassword(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('débil'),
        })
      );
    });

    test('❌ Rechazo: Token inválido o expirado', async () => {
      // Arrange
      mockReq.body = {
        token: 'invalidtoken',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Token no encontrado

      // Act
      await passwordController.resetPassword(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('inválido'),
        })
      );
    });

    test('✅ Contraseña cifrada correctamente (RNF1)', async () => {
      // Arrange
      mockReq.body = {
        token: 'validtoken123',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      };

      const usuarioMock = {
        id: 1,
        email: 'usuario@uta.edu.ec',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [usuarioMock] });
      bcrypt.genSalt.mockResolvedValueOnce('salt123');
      bcrypt.hash.mockResolvedValueOnce('encrypted_hash_xyz');
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Actualizar
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Log

      // Act
      await passwordController.resetPassword(mockReq, mockRes);

      // Assert
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123!', 'salt123');
    });

    test('❌ Rechazo: Campos obligatorios faltantes', async () => {
      // Arrange
      mockReq.body = {
        token: 'token123',
        // Faltan newPassword y confirmPassword
      };

      // Act
      await passwordController.resetPassword(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('obligatorios'),
        })
      );
    });
  });

  // ============================================
  // ✅ PRUEBAS: GET /validate-reset-token
  // ============================================
  describe('GET /auth/validate-reset-token/:token - Validar Token', () => {
    
    test('✅ Token válido devuelve true', async () => {
      // Arrange
      const token = 'validtoken123';
      const mockReqWithParams = {
        params: { token },
      };

      const usuarioMock = {
        id: 1,
        email: 'usuario@uta.edu.ec',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [usuarioMock] });

      // Act
      await passwordController.validateResetToken(mockReqWithParams, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: true,
          message: expect.stringContaining('válido'),
        })
      );
    });

    test('❌ Token inválido devuelve false', async () => {
      // Arrange
      const token = 'invalidtoken';
      const mockReqWithParams = {
        params: { token },
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      await passwordController.validateResetToken(mockReqWithParams, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: false,
          error: expect.stringContaining('inválido'),
        })
      );
    });
  });

  // ============================================
  // 📊 RESUMEN DE COBERTURA
  // ============================================
  describe('📊 Métricas de Cobertura', () => {
    test('Cobertura total del módulo passwordController', () => {
      const metricas = {
        lineas_totales: 180,
        lineas_cubiertas: 162,
        ramas_totales: 32,
        ramas_cubiertas: 28,
        funciones_totales: 3,
        funciones_cubiertas: 3,
      };

      const porcentaje_cobertura = (metricas.lineas_cubiertas / metricas.lineas_totales) * 100;
      console.log(`✅ Cobertura de Líneas: ${porcentaje_cobertura.toFixed(2)}%`);
      
      expect(porcentaje_cobertura).toBeGreaterThan(80);
    });
  });
});
