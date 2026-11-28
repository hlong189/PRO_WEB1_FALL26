require('dotenv').config();
 
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
 
module.exports = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 3000),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: num(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME || 'bus_ticket_booking',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  sessionSecret: process.env.SESSION_SECRET,
  csrfSecret: process.env.CSRF_SECRET,
  ticketQrSecret: process.env.TICKET_QR_SECRET,
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: num(process.env.SMTP_PORT, 1025),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.MAIL_FROM || 'Bus Ticket <no-reply@example.com>',
  },
  seatHoldMinutes: num(process.env.SEAT_HOLD_MINUTES, 10),
  checkinOpenHoursBefore: num(process.env.CHECKIN_OPEN_HOURS_BEFORE, 2),
  chatbotApiKey: process.env.CHATBOT_API_KEY || '',
  timezone: 'Asia/Ho_Chi_Minh',
};
 
// Thiếu secret bắt buộc thì dừng ngay, không chạy với giá trị mặc định yếu (DESIGN 2.6, 9)
for (const key of ['SESSION_SECRET', 'CSRF_SECRET', 'TICKET_QR_SECRET']) {
  if (!process.env[key]) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${key} (xem .env.example)`);
  }
}