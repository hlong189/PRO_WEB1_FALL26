
import db from './config/database.js';

async function testConnection() {
    try {
        const result = await db.raw(
            'SELECT current_database() AS name'
        );

        console.log('Ket noi PostgreSQL thanh cong!');
        console.log('Database:', result.rows[0].name);
    } catch (error) {
        console.log('Ket noi that bai:', error.message);
    } finally {
        await db.destroy();
    }
}

testConnection();
