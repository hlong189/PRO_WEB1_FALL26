const { doubleCsrf } = require('csrf-csrf');
const config = require('../config');
 
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => config.csrfSecret,
  getSessionIdentifier: (req) => req.session.id,
  cookieName: 'bt.csrf',
  cookieOptions: { sameSite: 'lax', secure: config.isProd, httpOnly: true, path: '/' },
  // AJAX gửi header X-CSRF-Token; form SSR gửi trường _csrf (DESIGN 9.7)
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] || (req.body && req.body._csrf),
});
 
/** Gắn token vào res.locals cho view SSR (<meta name="csrf-token">). */
function exposeCsrfToken(req, res, next) {
  req.session.touched = true;   // buộc session được lưu để session id ổn định
  res.locals.csrfToken = generateCsrfToken(req, res);
  next();
}
module.exports = { doubleCsrfProtection, exposeCsrfToken, generateCsrfToken };