import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import { requireRole, verifyToken } from '../src/middleware/authMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production';

const createResponse = () => {
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return response;
};

test('verifyToken rejects a missing authorization header', () => {
  const response = createResponse();
  let nextCalled = false;

  verifyToken({ headers: {} }, response, () => { nextCalled = true; });

  assert.equal(response.statusCode, 401);
  assert.match(response.body.message, /Missing or malformed/);
  assert.equal(nextCalled, false);
});

test('verifyToken rejects authorization schemes other than Bearer', () => {
  const response = createResponse();

  verifyToken({ headers: { authorization: 'Basic abc' } }, response, () => {});

  assert.equal(response.statusCode, 401);
  assert.match(response.body.message, /Missing or malformed/);
});

test('verifyToken rejects invalid and expired tokens', () => {
  const response = createResponse();

  verifyToken({ headers: { authorization: 'Bearer invalid-token' } }, response, () => {});

  assert.equal(response.statusCode, 401);
  assert.match(response.body.message, /Invalid or expired/);
});

test('verifyToken attaches token claims and supplies a default name', () => {
  const token = jwt.sign({ id: 'user-1', role: 'ANALYST', email: 'analyst@example.com' }, JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const response = createResponse();
  let nextCalled = false;

  verifyToken(req, response, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, {
    id: 'user-1',
    role: 'ANALYST',
    email: 'analyst@example.com',
    name: 'Staff User',
  });
});

test('requireRole allows a user with an allowed role', () => {
  const response = createResponse();
  let nextCalled = false;

  requireRole(['ADMIN', 'ANALYST'])(
    { user: { role: 'ANALYST' } },
    response,
    () => { nextCalled = true; }
  );

  assert.equal(nextCalled, true);
  assert.equal(response.statusCode, null);
});

test('requireRole rejects missing and disallowed roles', () => {
  for (const req of [{}, { user: { role: 'CLIENT' } }]) {
    const response = createResponse();
    let nextCalled = false;

    requireRole('ADMIN')(req, response, () => { nextCalled = true; });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(nextCalled, false);
  }
});
