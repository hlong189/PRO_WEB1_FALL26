/** Lỗi nghiệp vụ có mã HTTP + mã lỗi cố định (API.md mục 10). */
class AppError extends Error {
  constructor(status, code, message, { data, errors } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
    this.errors = errors;
    this.isAppError = true;
  }
}
const E = {
  validation: (errors, message = 'Dữ liệu không hợp lệ') =>
    new AppError(400, 'VALIDATION_ERROR', message, { errors }),
  unauthenticated: () => new AppError(401, 'UNAUTHENTICATED', 'Bạn cần đăng nhập để tiếp tục'),
  forbidden: (m = 'Bạn không có quyền thực hiện thao tác này') => new AppError(403, 'FORBIDDEN', m),
  notFound: (m = 'Không tìm thấy dữ liệu') => new AppError(404, 'NOT_FOUND', m),
};
module.exports = { AppError, E };