/* Public API của module tickets (DESIGN 3.2). Module khác CHỈ import từ file này. */
const service = require('./tickets.service');
const qr = require('./qr.service');
const repo = require('./tickets.repository');
const { query } = require('../../config/db');

module.exports = {
  issueTicketsForBooking: service.issueTicketsForBooking,   // trong transaction thanh toán (TV4)
  sendTicketsEmail: service.sendTicketsEmail,               // sau COMMIT (TV4)
  buildQrPayload: qr.buildPayload,
  verifyQrPayload: qr.verifyPayload,
  findTicketByCode: (code) => repo.findByCode({ query }, code),
  listTicketsOfTrip: (tripId) => repo.listByTripId({ query }, tripId),
};
