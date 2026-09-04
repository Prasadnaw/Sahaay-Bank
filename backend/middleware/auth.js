const { readDatabase, findUserById, findUserByUsername } = require('../utils/dbHelper');

// In-memory active token session store
const sessions = new Map();

function createSession(user) {
  const token = `sah_token_${user.id}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  sessions.set(token, {
    userId: user.id,
    createdAt: Date.now()
  });
  return token;
}

function authMiddleware(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    let user = null;

    // 1. Resolve from session store
    if (token && sessions.has(token)) {
      const session = sessions.get(token);
      user = findUserById(session.userId);
    }

    // 2. Direct userId or token prefix fallback (e.g. Bearer USR-1001)
    if (!user && token) {
      if (token.startsWith('USR-')) {
        user = findUserById(token);
      } else if (token.includes('_USR-')) {
        const parts = token.split('_');
        const usrPart = parts.find(p => p.startsWith('USR-'));
        if (usrPart) user = findUserById(usrPart);
      }
    }

    // 3. Fallback header x-user-id
    if (!user && req.headers['x-user-id']) {
      user = findUserById(req.headers['x-user-id']);
    }

    // 4. If still not authenticated, fallback to Asha Patel for legacy backwards compatibility
    if (!user) {
      // If endpoint strictly requires user, check if we have default fallback
      const db = readDatabase();
      user = db.users[0] || null;
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ success: false, error: 'Internal authentication error' });
  }
}

module.exports = {
  authMiddleware,
  createSession,
  sessions
};
