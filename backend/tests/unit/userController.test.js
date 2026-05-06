jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

const pool = require('../../src/config/database');
const userController = require('../../src/controllers/userController');

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('userController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('obtiene el perfil del usuario autenticado', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 3,
        nombre: 'Pasajero Test',
        email: 'pasajero@uta.edu.ec',
        carrera: 'Sistemas',
        telefono: '0999999999',
        foto_url: null,
        rol: 'PASAJERO',
        reputacion_promedio: '5.00',
        creado_en: '2026-05-06T18:00:00.000Z',
        zona_lat: null,
        zona_lon: null,
        viajes_conductor: '0',
        viajes_pasajero: '0'
      }]
    });

    const req = { user: { id: 3 } };
    const res = createRes();

    await userController.getProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      perfil: expect.objectContaining({
        email: 'pasajero@uta.edu.ec',
        rol: 'PASAJERO'
      })
    }));
  });

  it('rechaza actualizaciones sin campos válidos', async () => {
    const req = { user: { id: 3 }, body: {} };
    const res = createRes();

    await userController.updateProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'No se enviaron campos válidos para actualizar.'
    }));
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('actualiza el perfil con campos permitidos', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 3,
        nombre: 'Pasajero Test',
        email: 'pasajero@uta.edu.ec',
        carrera: 'Sistemas',
        telefono: '0999999999',
        foto_url: null,
        rol: 'CONDUCTOR',
        reputacion_promedio: '5.00',
        zona_lat: -1.2,
        zona_lon: -78.5,
        viajes_conductor: '0',
        viajes_pasajero: '0'
      }]
    });

    const req = {
      user: { id: 3 },
      body: { carrera: 'Sistemas', telefono: '0999999999', rol: 'CONDUCTOR' },
      file: null
    };
    const res = createRes();

    await userController.updateProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Perfil actualizado correctamente'
    }));
    expect(pool.query).toHaveBeenCalled();
  });
});