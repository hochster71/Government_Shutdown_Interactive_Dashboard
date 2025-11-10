import request from 'supertest';
import app from '../server.js';

describe('Impact Calculator API', () => {
  test('POST /api/impact/calc with valid inputs', async () => {
    const response = await request(app)
      .post('/api/impact/calc')
      .send({
        duration: 30,
        affectedWorkers: 800000,
        year: 2024
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('inputs');
    expect(response.body).toHaveProperty('impacts');
    expect(response.body).toHaveProperty('formatted');
    expect(response.body.inputs.duration).toBe(30);
    expect(response.body.inputs.affectedWorkers).toBe(800000);
  });

  test('POST /api/impact/calc validates duration min', async () => {
    const response = await request(app)
      .post('/api/impact/calc')
      .send({
        duration: 0,
        affectedWorkers: 800000
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/impact/calc validates duration max', async () => {
    const response = await request(app)
      .post('/api/impact/calc')
      .send({
        duration: 500,
        affectedWorkers: 800000
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/impact/calc validates affectedWorkers range', async () => {
    const response = await request(app)
      .post('/api/impact/calc')
      .send({
        duration: 30,
        affectedWorkers: 500
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/impact/calc uses default affectedWorkers', async () => {
    const response = await request(app)
      .post('/api/impact/calc')
      .send({
        duration: 30
      });

    expect(response.status).toBe(200);
    expect(response.body.inputs.affectedWorkers).toBe(800000);
  });

  test('POST /api/impact/calc calculates impacts correctly', async () => {
    const response = await request(app)
      .post('/api/impact/calc')
      .send({
        duration: 10,
        affectedWorkers: 100000
      });

    expect(response.status).toBe(200);
    
    const expectedDirect = 10 * 100000 * 400; // 400M
    expect(response.body.impacts.directImpact).toBe(expectedDirect);
    
    const expectedTotal = expectedDirect * 1.5;
    expect(response.body.impacts.totalEconomicImpact).toBe(expectedTotal);
  });

  test('POST /api/impact/calc validates year range', async () => {
    const response = await request(app)
      .post('/api/impact/calc')
      .send({
        duration: 30,
        year: 1900
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/impact/calc rejects non-numeric duration', async () => {
    const response = await request(app)
      .post('/api/impact/calc')
      .send({
        duration: 'thirty',
        affectedWorkers: 800000
      });

    expect(response.status).toBe(400);
  });
});

describe('API Security', () => {
  test('GET /api/shutdowns returns data without stack traces', async () => {
    const response = await request(app)
      .get('/api/shutdowns');

    expect(response.status).toBeLessThan(500);
    expect(JSON.stringify(response.body)).not.toMatch(/at \w+/); // No stack trace pattern
  });

  test('Server has security headers', async () => {
    const response = await request(app).get('/health');
    
    // Check for security headers
    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers).toHaveProperty('x-frame-options');
  });

  test('JSON body size limit enforced', async () => {
    const largePayload = {
      duration: 30,
      data: 'x'.repeat(200000) // 200KB of data
    };

    const response = await request(app)
      .post('/api/impact/calc')
      .send(largePayload);

    expect(response.status).toBe(413); // Payload too large
  });
});
