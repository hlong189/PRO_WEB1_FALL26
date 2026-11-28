/* services/mailer - mọi email đi qua sendMail() và được ghi vào email_logs (DESIGN 5.5, 8.2).
   Gửi lỗi KHÔNG ném exception: giao dịch chính không được hỏng vì email. */
const path = require('path');
const ejs = require('ejs');
const nodemailer = require('nodemailer');
const config = require('../config');
const { query } = require('../config/db');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: false,
      ignoreTLS: !config.smtp.user,           // MailHog không có TLS
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
      connectionTimeout: 5000,
      socketTimeout: 10000,
    });
  }
  return transporter;
}

async function writeLog({ userId, bookingId, to, emailType, status, error }) {
  try {
    await query(
      `INSERT INTO email_logs (user_id, booking_id, to_email, email_type, status, error_message, sent_at)
       VALUES ($1,$2,$3,$4,$5::varchar,$6, CASE WHEN $5::varchar = 'sent' THEN now() END)`,
      [userId || null, bookingId || null, to, emailType, status, error || null]);
  } catch (e) {
    console.error('[mailer] không ghi được email_logs:', e.message);
  }
}

async function sendMail({ to, subject, template, data = {}, attachments = [],
  userId = null, bookingId = null, emailType = 'other' }) {
  try {
    const html = await ejs.renderFile(
      path.join(__dirname, '..', 'views', 'emails', `${template}.ejs`), data);
    await getTransporter().sendMail({ from: config.smtp.from, to, subject, html, attachments });
    await writeLog({ userId, bookingId, to, emailType, status: 'sent' });
    return { ok: true };
  } catch (err) {
    await writeLog({ userId, bookingId, to, emailType, status: 'failed', error: err.message });
    return { ok: false, error: err.message };
  }
}

module.exports = { sendMail };
