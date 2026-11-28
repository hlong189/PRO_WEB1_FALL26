const TICKET_STATUS = Object.freeze({ VALID: 'valid', CHECKED_IN: 'checked_in', CANCELLED: 'cancelled' });

// Chuyển hợp lệ (DESIGN 7.4): valid -> checked_in | cancelled. checked_in không chuyển tiếp.
const TICKET_TRANSITIONS = Object.freeze({
  valid: ['checked_in', 'cancelled'],
  checked_in: [],
  cancelled: [],
});

const BOOKING_CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;          // bỏ I, O; số 2-9
const TICKET_CODE_RE = /^[A-HJ-NP-Z2-9]{8}-\d{2}$/;      // <booking_code>-NN

module.exports = { TICKET_STATUS, TICKET_TRANSITIONS, BOOKING_CODE_RE, TICKET_CODE_RE };
