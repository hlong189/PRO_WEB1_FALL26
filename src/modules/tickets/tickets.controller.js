const { sendSuccess } = require('../../utils/response');
const { E } = require('../../utils/errors');
const bookings = require('../bookings');
const service = require('./tickets.service');
const { BOOKING_CODE_RE, TICKET_CODE_RE } = require('./tickets.constants');

/** Trả 404 (không phải 403) khi không có quyền: không tiết lộ đơn/vé có tồn tại (API 3.4) */
async function loadOwnedBooking(req, _res, next) {
  const code = String(req.params.booking_code || '').toUpperCase();
  if (!BOOKING_CODE_RE.test(code)) return next(E.notFound());
  const booking = await bookings.findBookingByCode(code);
  if (!booking || !bookings.canAccessBooking(req, booking)) return next(E.notFound());
  req.booking = booking;
  next();
}

async function loadOwnedTicket(req, _res, next) {
  const code = String(req.params.ticket_code || '').toUpperCase();
  if (!TICKET_CODE_RE.test(code)) return next(E.notFound());
  const ticket = await service.getTicketRow(code);
  if (!ticket || !bookings.canAccessBooking(req, { booking_code: ticket.booking_code, user_id: ticket.user_id })) {
    return next(E.notFound());
  }
  req.ticket = ticket;
  next();
}

async function listByBooking(req, res) {
  const items = await service.getTicketsOfBooking(req.booking.booking_code);
  return sendSuccess(res, { booking_code: req.booking.booking_code, items }, 'Lấy danh sách vé thành công');
}

async function getOne(req, res) {
  return sendSuccess(res, service.toDto(req.ticket), 'Lấy thông tin vé thành công');
}

async function getQr(req, res) {
  const png = await service.renderQrPng(req.ticket.ticket_code);
  res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' });
  return res.send(png);
}

async function resend(req, res) {
  const data = await service.resendTickets(req.booking.booking_code);
  return sendSuccess(res, data, 'Đã gửi lại email vé');
}

module.exports = { loadOwnedBooking, loadOwnedTicket, listByBooking, getOne, getQr, resend };
