const request = require('supertest');
const app = require('../../src/server'); // El servidor exportado

describe('U-Ride API Tests', () => {
  it('Debe responder 200 al endpoint de Health Check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});
