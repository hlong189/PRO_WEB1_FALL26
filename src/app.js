const path = require('path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const expressLayouts = require('express-ejs-layouts');
 
const config = require('./config');
const { pool } = require('./config/db');
const { attachUser } = require('./middlewares/auth');
const { doubleCsrfProtection, exposeCsrfToken } = require('./middlewares/csrf');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { formatDateTimeVN } = require('./utils/datetime');
const { formatVND } = require('./utils/money');
const { badge } = require('./utils/status-labels');
const { api, pages } = require('./routes');
 
function createApp() {
  const app = express();
  if (config.isProd) app.set('trust proxy', 1);
 
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(expressLayouts);
  app.set('layout', 'layouts/main');
  app.set('layout extractScripts', true);
  app.locals.fmt = { dateTime: formatDateTimeVN, money: formatVND };
  app.locals.badge = badge;
 
  app.use(helmet());
  if (config.env !== 'test') app.use(morgan('dev'));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
 
  // Tài nguyên tĩnh: tự host, không dùng CDN (DESIGN 16.12, 16.16)
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/vendor/bootstrap', express.static(path.join(__dirname, '..', 'node_modules', 'bootstrap', 'dist')));
  app.use('/vendor/chart.js', express.static(path.join(__dirname, '..', 'node_modules', 'chart.js', 'dist')));
 
  app.use(session({
    store: new pgSession({ pool, tableName: 'sessions' }),
    secret: config.sessionSecret, resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: 7 * 24 * 3600 * 1000 },
  }));
  app.use(attachUser);
 
  app.get('/api/v1/csrf-token', exposeCsrfToken, (req, res) =>
    res.json({ success: true, message: 'OK', data: { csrf_token: res.locals.csrfToken } }));
  app.use(doubleCsrfProtection);                                   // POST/PUT/PATCH/DELETE đều cần token
  app.use((req, res, next) => (req.method === 'GET' && !req.path.startsWith('/api') ? exposeCsrfToken(req, res, next) : next()));
 
  app.use('/api/v1', api);
  app.use(pages);
 
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };