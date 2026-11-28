const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/response');
 
/** Rate limit theo API.md 2.9; vượt giới hạn -> 429 RATE_LIMITED + header Retry-After */
function limiter({ windowMs, limit, keyGenerator, message = 'Bạn thao tác quá nhanh, vui lòng thử lại sau' }) {
  return rateLimit({
    windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (req, res) => sendError(res, 429, 'RATE_LIMITED', message),
  });
}
module.exports = { limiter };