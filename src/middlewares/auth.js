/* middlewares/auth - TV1 sở hữu. Đây là bản tối thiểu để module của TV5 chạy được;
   khi TV1 hoàn thiện thì giữ nguyên tên hàm (requireAuth, requireRole, attachUser). */
const { query } = require('../config/db');
const { E } = require('../utils/errors');

async function attachUser(req, res, next) {
  res.locals.currentUser = null;
  const sess = req.session && req.session.user;
  if (sess) {
    const { rows } = await query(
      `SELECT id, full_name, email, role, status FROM users WHERE id = $1`, [sess.id]);
    const u = rows[0];
    if (u && u.status === 'active') { req.user = u; res.locals.currentUser = u; }
  }
  next();
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  if (req.originalUrl.startsWith('/api')) return next(E.unauthenticated());
  return res.redirect('/login');
}

const requireRole = (...roles) => [
  requireAuth,
  (req, _res, next) => (roles.includes(req.user.role) ? next() : next(E.forbidden())),
];

module.exports = { attachUser, requireAuth, requireRole };
