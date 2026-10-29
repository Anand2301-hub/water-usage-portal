// Run with: npm test
// Uses a SEPARATE database (water_usage_test) on the same cluster, so real data is never touched.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_jest_only_1234567890';
require('dotenv').config();
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/water_usage_test';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const app = require('../app');
const User = require('../models/User');

const TEST_DB = 'water_usage_test';
const todayISO = new Date().toISOString().slice(0, 10);

const userA = { name: 'Alice Test', email: 'alice@test.com', password: 'Secret123', confirmPassword: 'Secret123', address: 'Chennai' };
const userB = { name: 'Bob Test', email: 'bob@test.com', password: 'Secret123', confirmPassword: 'Secret123' };

let agentA; let agentB; let recordId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: TEST_DB, serverSelectionTimeoutMS: 15000 });
  await mongoose.connection.dropDatabase();
  await User.init();
  agentA = request.agent(app);
  agentB = request.agent(app);
});

afterAll(async () => {
  if (mongoose.connection.name === TEST_DB) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Authentication', () => {
  test('TC01 registers a new user successfully', async () => {
    const res = await agentA.post('/api/auth/register').send(userA);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.role).toBe('user');
  });

  test('TC02 rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(userA);
    expect(res.status).toBe(409);
  });

  test('TC03 rejects weak password and mismatched confirmation', async () => {
    const weak = await request(app).post('/api/auth/register').send({ ...userB, password: 'abc', confirmPassword: 'abc' });
    expect(weak.status).toBe(400);
    const mismatch = await request(app).post('/api/auth/register').send({ ...userB, confirmPassword: 'Different1' });
    expect(mismatch.status).toBe(400);
  });

  test('TC04 cannot register as admin by sending a role', async () => {
    const res = await agentB.post('/api/auth/register').send({ ...userB, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
  });

  test('TC05 logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@test.com', password: 'Secret123' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);
  });

  test('TC06 rejects invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@test.com', password: 'WrongPass1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  test('TC07 blocks unauthenticated access', async () => {
    const res = await request(app).get('/api/usage');
    expect(res.status).toBe(401);
  });
});

describe('Usage CRUD and validation', () => {
  const valid = { usageDate: todayISO, category: 'bathing', quantityLitres: 40, notes: 'Morning shower' };

  test('TC08 creates a usage record', async () => {
    const res = await agentA.post('/api/usage').send(valid);
    expect(res.status).toBe(201);
    recordId = res.body.data._id;
  });

  test('TC09 rejects zero and negative quantities', async () => {
    expect((await agentA.post('/api/usage').send({ ...valid, quantityLitres: 0 })).status).toBe(400);
    expect((await agentA.post('/api/usage').send({ ...valid, quantityLitres: -5 })).status).toBe(400);
  });

  test('TC10 rejects invalid category, future date and bad date', async () => {
    expect((await agentA.post('/api/usage').send({ ...valid, category: 'swimming' })).status).toBe(400);
    expect((await agentA.post('/api/usage').send({ ...valid, usageDate: '2999-01-01' })).status).toBe(400);
    expect((await agentA.post('/api/usage').send({ ...valid, usageDate: 'not-a-date' })).status).toBe(400);
  });

  test('TC11 retrieves usage history', async () => {
    const res = await agentA.get('/api/usage');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });

  test('TC12 rejects an invalid ObjectId', async () => {
    expect((await agentA.get('/api/usage/123')).status).toBe(400);
  });

  test('TC13 updates a record', async () => {
    const res = await agentA.put(`/api/usage/${recordId}`).send({ ...valid, quantityLitres: 55 });
    expect(res.status).toBe(200);
    expect(res.body.data.quantityLitres).toBe(55);
  });

  test("TC14 another user cannot read, edit or delete someone else's record", async () => {
    expect((await agentB.get(`/api/usage/${recordId}`)).status).toBe(404);
    expect((await agentB.put(`/api/usage/${recordId}`).send(valid)).status).toBe(404);
    expect((await agentB.delete(`/api/usage/${recordId}`)).status).toBe(404);
    const list = await agentB.get('/api/usage');
    expect(list.body.data).toHaveLength(0);
  });

  test('TC15 search, filter and CSV export work', async () => {
    const found = await agentA.get('/api/usage?q=shower&category=bathing');
    expect(found.body.data).toHaveLength(1);
    const none = await agentA.get('/api/usage?category=cooking');
    expect(none.body.data).toHaveLength(0);
    const csv = await agentA.get('/api/reports/export.csv');
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('bathing');
  });

  test('TC16 deletes a record', async () => {
    expect((await agentA.delete(`/api/usage/${recordId}`)).status).toBe(200);
    expect((await agentA.get(`/api/usage/${recordId}`)).status).toBe(404);
  });
});

describe('Reports', () => {
  test('TC17 summary calculations match stored records', async () => {
    for (const q of [10, 20, 30]) {
      await agentA.post('/api/usage').send({ usageDate: todayISO, category: 'cooking', quantityLitres: q });
    }
    const res = await agentA.get(`/api/reports/summary?today=${todayISO}`);
    expect(res.status).toBe(200);
    expect(res.body.data.today.total).toBe(60);
    expect(res.body.data.today.count).toBe(3);
    expect(res.body.data.allTime.total).toBe(60);
    expect(res.body.data.goal.targetDailyLitres).toBe(135);
    expect(res.body.data.estimatedSavedWeek).toBe(135 * 7 - 60);
  });

  test('TC18 category report totals are correct', async () => {
    const res = await agentA.get('/api/reports/categories');
    expect(res.body.data[0].category).toBe('cooking');
    expect(res.body.data[0].total).toBe(60);
    expect(res.body.data[0].percent).toBe(100);
  });
});

describe('Authorization and admin', () => {
  test('TC19 normal user cannot access admin endpoints', async () => {
    expect((await agentA.get('/api/admin/dashboard')).status).toBe(403);
    expect((await agentA.get('/api/admin/users')).status).toBe(403);
  });

  test('TC20 admin can access admin endpoints', async () => {
    await User.create({ name: 'Admin Test', email: 'admin@test.com', passwordHash: await bcrypt.hash('Admin1234', 10), role: 'admin' });
    const admin = request.agent(app);
    const login = await admin.post('/api/auth/login').send({ email: 'admin@test.com', password: 'Admin1234' });
    expect(login.status).toBe(200);
    const dash = await admin.get('/api/admin/dashboard');
    expect(dash.status).toBe(200);
    expect(dash.body.data.totalUsers).toBe(2);
    expect(dash.body.data.totalLitres).toBe(60);
    const users = await admin.get('/api/admin/users');
    expect(users.body.data.length).toBe(3);
  });

  test('TC21 profile update cannot change role', async () => {
    const res = await agentA.put('/api/auth/profile').send({ name: 'Alice Updated', address: 'Madurai', role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('user');
    expect(res.body.user.name).toBe('Alice Updated');
  });

  test('TC22 logout clears the session cookie', async () => {
    const res = await agentA.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect((await agentA.get('/api/auth/me')).status).toBe(401);
  });
});

describe('Database failure', () => {
  test('TC23 connecting to an unreachable MongoDB fails with an error', async () => {
    const bad = mongoose.createConnection('mongodb://127.0.0.1:1/none', { serverSelectionTimeoutMS: 1500 });
    await expect(bad.asPromise()).rejects.toThrow();
    await bad.close().catch(() => {});
  });
});
