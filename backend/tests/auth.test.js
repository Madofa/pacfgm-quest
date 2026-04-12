const request = require('supertest');
const app     = require('../server');
const pool    = require('../db/connection');

// Unique email per test run to avoid duplicates
const EMAIL = `test_${Date.now()}@pacfgm.test`;
const ALIAS = `alumne_${Date.now()}`;

let token;

afterAll(async () => {
  await pool.query('DELETE FROM usuaris WHERE email = ?', [EMAIL]);
  await pool.end();
});

describe('GET /api/health', () => {
  it('retorna status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/auth/register', () => {
  it('registra un usuari nou i retorna token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nom:      'Alumne Test',
      alias:    ALIAS,
      email:    EMAIL,
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuari.email).toBe(EMAIL);
    token = res.body.token;
  });

  it('rebutja registre duplicat', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nom: 'Altre', alias: ALIAS, email: EMAIL, password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('rebutja camps buits', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: EMAIL });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('fa login correctament i retorna token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: EMAIL, password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  it('rebutja password incorrecte', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: EMAIL, password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('rebutja email inexistent', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'noeexiste@test.com', password: 'password123',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('retorna dades de l\'usuari autenticat', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(EMAIL);
  });

  it('rebutja accés sense token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rebutja token invàlid', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer tokenfalso');
    expect(res.status).toBe(403);
  });
});
