const { Pool } = require('pg');
const config = require('./index');
 
const pool = new Pool(config.db);
 
/** Truy vấn có tham số (parameterized) - không nối chuỗi dữ liệu người dùng vào SQL. */
const query = (text, params) => pool.query(text, params);
 
/**
 * Chạy fn(client) trong một transaction. Lỗi bất kỳ -> ROLLBACK.
 * Không gọi API ngoài / gửi email bên trong fn (DATABASE.md mục 9).
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
 
module.exports = { pool, query, withTransaction };