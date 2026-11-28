const config = require('./config');
const { createApp } = require('./app');
const { pool } = require('./config/db');

const app = createApp();
const server = app.listen(config.port, () => console.log(`Server chạy tại ${config.baseUrl} (${config.env})`));

// Tắt êm khi Docker dừng container
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.close(() => pool.end().then(() => process.exit(0))));
}
