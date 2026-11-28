const config = require('../../config');
const { query } = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { toVNIso, formatDateTimeVN } = require('../../utils/datetime');
const { formatVND } = require('../../utils/money');
const mailer = require('../../services/mailer');
const repo = require('./tickets.repository');
const qr = require('./qr.service');

/** Dạng trả về cho client: không lộ id nội bộ, thời gian có offset +07:00 */
function toDto(t) {
  return {
    ticket_code: t.ticket_code,
    status: t.status,
    issued_at: toVNIso(t.issued_at),
    passenger: { full_name: t.passenger_name, phone: t.passenger_phone },
    seat: { seat_number: t.seat_number, seat_type: t.seat_type, floor: t.floor },
    price: t.price,
    booking_code: t.booking_code,
    trip: {
      id: t.trip_id, route_name: t.route_name, license_plate: t.license_plate,
      departure_at: toVNIso(t.departure_at), arrival_at: toVNIso(t.arrival_at),
      origin_station: t.origin_station, destination_station: t.destination_station,
    },
    pickup: { name: t.pickup_name, address: t.pickup_address, scheduled_at: toVNIso(t.pickup_at) },
    dropoff: { name: t.dropoff_name, address: t.dropoff_address },
    checked_in_at: toVNIso(t.checked_in_at),
  };
}

/**
 * PHÁT HÀNH VÉ - gọi BÊN TRONG transaction xác nhận thanh toán của TV4 (DATABASE 7.4 bước 5).
 * Quy tắc: chỉ phát hành khi đơn `confirmed` VÀ có payment `success`.
 */
async function issueTicketsForBooking(client, bookingId) {
  const b = await repo.lockBookingForIssue(client, bookingId);
  if (!b) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn đặt vé');
  if (b.status !== 'confirmed' || !b.has_paid) {
    throw new AppError(422, 'BOOKING_NOT_CONFIRMED', 'Chỉ phát hành vé cho đơn đã thanh toán thành công');
  }
  await repo.insertForBooking(client, bookingId);              // idempotent (ON CONFLICT DO NOTHING)
  return repo.listByBookingId(client, bookingId);
}

async function getTicketsOfBooking(bookingCode) {
  const rows = await repo.listByBookingCode({ query }, bookingCode);
  if (rows.length === 0) {
    throw new AppError(422, 'BOOKING_NOT_CONFIRMED', 'Đơn này chưa có vé (chỉ đơn đã thanh toán mới có vé)');
  }
  return rows.map(toDto);
}

async function getTicketRow(ticketCode) {
  return repo.findByCode({ query }, ticketCode);
}

async function renderQrPng(ticketCode) {
  return qr.toPngBuffer(ticketCode);
}

/**
 * Gửi email vé - gọi SAU KHI COMMIT. Lỗi gửi mail chỉ được ghi log, không làm hỏng giao dịch.
 * QR được nhúng bằng cid để hiển thị được cả khi email client chặn ảnh từ xa.
 */
async function sendTicketsEmail(bookingId, { emailType = 'ticket' } = {}) {
  const tickets = await repo.listByBookingId({ query }, bookingId);
  if (tickets.length === 0) return { ok: false, error: 'Đơn chưa có vé' };
  const head = tickets[0];

  const attachments = [];
  const items = [];
  for (const t of tickets) {
    const cid = `qr-${t.ticket_code}@busticket`;
    attachments.push({ filename: `${t.ticket_code}.png`, content: await qr.toPngBuffer(t.ticket_code), cid });
    items.push({ ...t, cid, departureText: formatDateTimeVN(t.departure_at), priceText: formatVND(t.price) });
  }
  return mailer.sendMail({
    to: head.contact_email,
    subject: `Vé điện tử – Mã đặt chỗ ${head.booking_code}`,
    template: 'tickets/ticket-confirmation',
    data: {
      booking: head, tickets: items, baseUrl: config.baseUrl,
      totalText: formatVND(tickets.reduce((s, t) => s + t.price, 0)),
    },
    attachments, userId: head.user_id, bookingId, emailType,
  });
}

async function resendTickets(bookingCode) {
  const rows = await repo.listByBookingCode({ query }, bookingCode);
  if (rows.length === 0 || rows[0].booking_status !== 'confirmed') {
    throw new AppError(422, 'BOOKING_NOT_CONFIRMED', 'Chỉ đơn đã xác nhận mới gửi lại được vé');
  }
  const r = await sendTicketsEmail(rows[0].booking_id);
  if (!r.ok) throw new AppError(500, 'INTERNAL_ERROR', 'Chưa gửi được email, vui lòng thử lại sau');
  return { sent_to: rows[0].contact_email };
}

module.exports = {
  toDto, issueTicketsForBooking, getTicketsOfBooking, getTicketRow,
  renderQrPng, sendTicketsEmail, resendTickets,
};
