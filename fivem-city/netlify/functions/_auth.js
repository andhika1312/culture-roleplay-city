const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET belum diatur di Environment Variables Netlify.');
  }
  return secret;
}

function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '12h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch (e) {
    return null;
  }
}

// Ambil token dari header Authorization: Bearer xxx
function getTokenFromEvent(event) {
  const header = event.headers.authorization || event.headers.Authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

function requireAuth(event, allowedRoles) {
  const token = getTokenFromEvent(event);
  if (!token) return { ok: false, status: 401, message: 'Belum login.' };
  const decoded = verifyToken(token);
  if (!decoded) return { ok: false, status: 401, message: 'Sesi tidak valid atau kedaluwarsa. Silakan login kembali.' };
  if (allowedRoles && !allowedRoles.includes(decoded.role)) {
    return { ok: false, status: 403, message: 'Anda tidak memiliki akses untuk aksi ini.' };
  }
  return { ok: true, user: decoded };
}

module.exports = { signToken, verifyToken, getTokenFromEvent, requireAuth };
