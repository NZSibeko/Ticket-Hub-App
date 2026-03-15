const AUTH_COOKIE_NAME = 'th_auth_token';

const failedLogins = new Map();

const lockoutThreshold = Number(process.env.AUTH_LOCKOUT_THRESHOLD || 5);
const lockoutWindowMs = Number(process.env.AUTH_LOCKOUT_WINDOW_MS || 15 * 60 * 1000);
const cleanupIntervalMs = Number(process.env.AUTH_LOCKOUT_CLEANUP_MS || 5 * 60 * 1000);

function normalizeIdentifier(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function getLoginIdentifier(req) {
  const body = req.body || {};
  return normalizeIdentifier(body.email || body.username || body.identifier);
}

function getLoginKey(req) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
  const identifier = getLoginIdentifier(req);
  return `${ip}:${identifier || 'unknown'}`;
}

function getLockState(key) {
  const state = failedLogins.get(key);
  if (!state) return null;
  if (state.lockedUntil && Date.now() > state.lockedUntil) {
    failedLogins.delete(key);
    return null;
  }
  return state;
}

function isLocked(key) {
  const state = getLockState(key);
  return !!(state && state.lockedUntil && Date.now() < state.lockedUntil);
}

function registerFailedAttempt(key) {
  const now = Date.now();
  const current = getLockState(key) || { count: 0, firstAttempt: now, lockedUntil: 0 };

  if (now - current.firstAttempt > lockoutWindowMs) {
    current.count = 0;
    current.firstAttempt = now;
    current.lockedUntil = 0;
  }

  current.count += 1;
  if (current.count >= lockoutThreshold) {
    current.lockedUntil = now + lockoutWindowMs;
  }

  failedLogins.set(key, current);
  return current;
}

function registerSuccessfulAttempt(key) {
  failedLogins.delete(key);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const part of String(cookieHeader).split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[AUTH_COOKIE_NAME] || null;
}

function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = process.env.AUTH_COOKIE_SAMESITE || 'Lax';
  const maxAge = Number(process.env.AUTH_COOKIE_MAX_AGE_MS || 24 * 60 * 60 * 1000);
  const cookie = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
    `Max-Age=${Math.floor(maxAge / 1000)}`
  ];
  if (secure) cookie.push('Secure');
  res.append('Set-Cookie', cookie.join('; '));
}

function clearAuthCookie(res) {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = process.env.AUTH_COOKIE_SAMESITE || 'Lax';
  const cookie = [
    `${AUTH_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
    'Max-Age=0'
  ];
  if (secure) cookie.push('Secure');
  res.append('Set-Cookie', cookie.join('; '));
}

module.exports = {
  AUTH_COOKIE_NAME,
  getLoginIdentifier,
  getLoginKey,
  isLocked,
  registerFailedAttempt,
  registerSuccessfulAttempt,
  getTokenFromRequest,
  parseCookies,
  setAuthCookie,
  clearAuthCookie
};

setInterval(() => {
  const now = Date.now();
  for (const [key, state] of failedLogins.entries()) {
    if (!state) {
      failedLogins.delete(key);
      continue;
    }
    if (state.lockedUntil && now > state.lockedUntil) {
      failedLogins.delete(key);
      continue;
    }
    if (!state.lockedUntil && now - state.firstAttempt > lockoutWindowMs) {
      failedLogins.delete(key);
    }
  }
}, cleanupIntervalMs).unref();
