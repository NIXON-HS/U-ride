jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn()
}));

const pool = require('../../src/config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authController = require('../../src/controllers/authController');

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registra un usuario institucional', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 10, nombre: 'Test User', email: 'test@uta.edu.ec', rol: 'PASAJERO' }]
      });
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed-password');

    const req = {
      body: { nombre: 'Test User', email: 'test@uta.edu.ec', password: 'secret123' }
    };
    const res = createRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Estudiante registrado correctamente en U-Ride'
    }));
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it('rechaza correos fuera de @uta.edu.ec', async () => {
    const req = {
      body: { nombre: 'Test User', email: 'test@gmail.com', password: 'secret123' }
    };
    const res = createRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('@uta.edu.ec')
    }));
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('inicia sesión correctamente con credenciales válidas', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        nombre: 'Admin',
        email: 'admin@uta.edu.ec',
        password_hash: 'hashed-password',
        rol: 'ADMINISTRADOR',
        activo: true
      }]
    });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('jwt-token');

    const req = {
      body: { email: 'admin@uta.edu.ec', password: 'admin123' }
    };
    const res = createRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      token: 'jwt-token',
      usuario: expect.objectContaining({
        email: 'admin@uta.edu.ec',
        rol: 'ADMINISTRADOR'
      })
    }));
  });

  it('rechaza credenciales incorrectas', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        nombre: 'Admin',
        email: 'admin@uta.edu.ec',
        password_hash: 'hashed-password',
        rol: 'ADMINISTRADOR',
        activo: true
      }]
    });
    bcrypt.compare.mockResolvedValue(false);

    const req = {
      body: { email: 'admin@uta.edu.ec', password: 'wrong-password' }
    };
    const res = createRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Credenciales incorrectas'
    }));
  });
});