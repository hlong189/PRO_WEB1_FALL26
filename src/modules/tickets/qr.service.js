/* Mã QR = "<ticket_code>.<chữ ký>" (DATABASE.md 4.5).
   Chữ ký = HMAC-SHA256(TICKET_QR_SECRET, ticket_code) cắt 10 ký tự hex.
   Không lưu token trong DB: có thể dựng lại QR bất cứ lúc nào, và giả mạo QR là không thể
   nếu không biết secret. Nhưng chữ ký chỉ chứng minh "mã do hệ thống phát hành";
   vé còn hợp lệ hay không luôn do DB quyết định (tickets.status). */
const crypto = require('crypto');
const QRCode = require('qrcode');
const config = require('../../config');

const SIG_LEN = 10;

function sign(ticketCode) {
  return crypto.createHmac('sha256', config.ticketQrSecret).update(ticketCode).digest('hex').slice(0, SIG_LEN);
}

function buildPayload(ticketCode) {
  return `${ticketCode}.${sign(ticketCode)}`;
}

/** @returns {string|null} ticket_code nếu chữ ký đúng, ngược lại null */
function verifyPayload(payload) {
  if (typeof payload !== 'string') return null;
  const i = payload.lastIndexOf('.');
  if (i < 1) return null;
  const code = payload.slice(0, i);
  const sig = payload.slice(i + 1);
  const expected = sign(code);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return code;
}

function toPngBuffer(ticketCode) {
  return QRCode.toBuffer(buildPayload(ticketCode), {
    type: 'png', width: 320, margin: 2, errorCorrectionLevel: 'M',
  });
}

module.exports = { buildPayload, verifyPayload, toPngBuffer };
