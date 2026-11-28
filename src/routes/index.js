/* Gắn router của từng module vào app (DESIGN 3). API JSON ở /api/v1, trang SSR ở gốc. */
const express = require('express');
const { requireRole } = require('../middlewares/auth');
const { sendSuccess } = require('../utils/response');
const { exposeCsrfToken } = require('../middlewares/csrf');
const trips = require('../modules/trips');
 
const api = express.Router();
api.get('/csrf-token', exposeCsrfToken, (req, res) => sendSuccess(res, { csrf_token: res.locals.csrfToken }, 'OK'));
api.use(require('../modules/auth/auth.routes'));                    // TV1
api.use(require('../modules/bookings/bookings.routes'));            // TV4
api.get('/staff/trips', requireRole('staff', 'admin'), async (req, res) =>   // TV3 (bản tối thiểu)
  sendSuccess(res, { items: await trips.listStaffTrips(req.user) }, 'OK'));
api.use(require('../modules/tickets/tickets.routes'));              // TV5
api.use(require('../modules/checkins/checkins.routes'));            // TV5
api.use(require('../modules/booking-admin/booking-admin.routes'));  // TV5
api.use(require('../modules/reports/reports.routes'));              // TV5
api.use(require('../modules/chatbot/chatbot.routes'));              // TV5
 
const pages = express.Router();
pages.get('/', (req, res) => res.render('home', { layout: 'layouts/main', title: 'Trang chủ' }));
pages.get('/login', (req, res) => res.render('auth/login', { layout: 'layouts/auth', title: 'Đăng nhập' }));
pages.use(require('../modules/checkins/checkins.pages'));
pages.use(require('../modules/reports/reports.pages'));
pages.use(require('../modules/booking-admin/booking-admin.pages'));
 
module.exports = { api, pages };