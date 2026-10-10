import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import User from '../src/models/User.js';
import { login } from '../src/controllers/authController.js';

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

test('login normalizes email, returns a signed JWT, and includes staff identity', async () => {
  const originalFindOne = User.findOne;
  let lookup;
  User.findOne = async (filter) => {
    lookup = filter;
    return {
      _id: 'staff-1',
      name: 'Analyst One',
      email: 'analyst@example.com',
      role: 'ANALYST',
      isActive: true,
      comparePassword: async (password) => password === 'correct-password',
    };
  };

  try {
    const response = createResponse();
    await login({ body: { email: ' Analyst@Example.com ', password: 'correct-password' } }, response);

    assert.deepEqual(lookup, { email: 'analyst@example.com' });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.deepEqual(jwt.verify(response.body.token, JWT_SECRET), {
      id: 'staff-1',
      email: 'analyst@example.com',
      role: 'ANALYST',
      name: 'Analyst One',
      iat: jwt.verify(response.body.token, JWT_SECRET).iat,
      exp: jwt.verify(response.body.token, JWT_SECRET).exp,
    });
    assert.deepEqual(response.body.user, {
      id: 'staff-1',
      name: 'Analyst One',
      email: 'analyst@example.com',
      role: 'ANALYST',
    });
  } finally {
    User.findOne = originalFindOne;
  }
});

test('login rejects inactive users and incorrect passwords', async () => {
  const originalFindOne = User.findOne;
  User.findOne = async ({ email }) => {
    if (email === 'inactive@example.com') {
      return { isActive: false };
    }
    return {
      isActive: true,
      comparePassword: async () => false,
    };
  };

  try {
    for (const email of ['inactive@example.com', 'wrong-password@example.com']) {
      const response = createResponse();
      await login({ body: { email, password: 'incorrect' } }, response);

      assert.equal(response.statusCode, 401);
      assert.equal(response.body.success, false);
      assert.equal(response.body.message, 'Invalid email or password.');
    }
  } finally {
    User.findOne = originalFindOne;
  }
});
