const express = require('express');
const c = require('./tickets.controller');
const { limiter } = require('../../middlewares/rateLimit');

const router = express.Router();

router.get('/bookings/:booking_code/tickets', c.loadOwnedBooking, c.listByBooking);

// 3 lần/giờ/đơn (API 2.9). Đặt SAU kiểm tra quyền để người lạ không làm cạn hạn mức của chủ đơn.
router.post('/bookings/:booking_code/resend-tickets',
  c.loadOwnedBooking,
  limiter({ windowMs: 60 * 60 * 1000, limit: 3, keyGenerator: (req) => req.params.booking_code.toUpperCase(),
            message: 'Bạn đã yêu cầu gửi lại vé quá 3 lần trong 1 giờ' }),
  c.resend);

router.get('/tickets/:ticket_code', c.loadOwnedTicket, c.getOne);
router.get('/tickets/:ticket_code/qr', c.loadOwnedTicket, c.getQr);

module.exports = router;
