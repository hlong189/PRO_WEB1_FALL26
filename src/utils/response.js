/** Helper response chung (DESIGN 5.3, API 2.5-2.6). Controller không tự dựng JSON. */
function sendSuccess(res, data = null, message = 'Thao tác thành công', status = 200) {
  return res.status(status).json({ success: true, message, data });
}
function sendError(res, status, code, message, { errors, data } = {}) {
  const body = { success: false, code, message };
  if (errors) body.errors = errors;
  if (data !== undefined) body.data = data;
  return res.status(status).json(body);
}
module.exports = { sendSuccess, sendError };