const { sendError } = require('../utils/response');
 
/** Trả JSON cho /api, render errors/* cho trang. Không lộ stack trace, SQL (DESIGN 5.8). */
function notFoundHandler(req, res, next) {
  const err = new Error('Không tìm thấy trang hoặc tài nguyên');
  err.status = 404; err.code = 'NOT_FOUND'; err.isAppError = true;
  next(err);
}
 
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message;
 
  if (err.type === 'entity.parse.failed') {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Dữ liệu gửi lên không đúng định dạng JSON';
  }
  if (err.code === 'EBADCSRFTOKEN' || err.message === 'invalid csrf token') {
    status = 403; code = 'FORBIDDEN'; message = 'Phiên làm việc không hợp lệ (CSRF). Vui lòng tải lại trang';
  }
  if (!err.isAppError && status === 500) {
    console.error('[ERROR]', req.method, req.originalUrl, err);   // chỉ log nội bộ
    message = 'Có lỗi xảy ra, vui lòng thử lại sau';
    code = 'INTERNAL_ERROR';
  }
 
  if (res.headersSent) return;
  if (req.originalUrl.startsWith('/api')) {
    return sendError(res, status, code, message, { errors: err.errors, data: err.data });
  }
  const view = [403, 404].includes(status) ? `errors/${status}` : 'errors/500';
  return res.status(status).render(view, { layout: 'layouts/auth', title: 'Lỗi', message });
}
module.exports = { notFoundHandler, errorHandler };