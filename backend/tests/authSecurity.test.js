const test = require('node:test');
const assert = require('node:assert/strict');
const authSecurity = require('../utils/authSecurity');

test('parseCookies parses cookie header', () => {
  const cookies = authSecurity.parseCookies('a=1; th_auth_token=abc123; c=hello');
  assert.equal(cookies.a, '1');
  assert.equal(cookies.th_auth_token, 'abc123');
  assert.equal(cookies.c, 'hello');
});

test('getTokenFromRequest prefers bearer token', () => {
  const req = {
    headers: {
      authorization: 'Bearer bearer-token',
      cookie: 'th_auth_token=cookie-token'
    }
  };
  assert.equal(authSecurity.getTokenFromRequest(req), 'bearer-token');
});

test('getTokenFromRequest falls back to auth cookie', () => {
  const req = {
    headers: {
      cookie: 'foo=bar; th_auth_token=cookie-token'
    }
  };
  assert.equal(authSecurity.getTokenFromRequest(req), 'cookie-token');
});
