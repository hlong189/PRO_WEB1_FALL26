import db from './config/database.js';
import bcrypt from 'bcrypt';

async function testPassword() {
    try {
        const user = await db('users')
            .where({ email: 'jqk@gmail.com' })
            .first();

        if (!user) {
            console.log('Khong tim thay tai khoan!');
            return;
        }

        const result = await bcrypt.compare(
            'jqk123456',
            user.password_hash
        );

        console.log('Ket qua kiem tra:', result);

    } catch (error) {
        console.log(error.message);
    } finally {
        await db.destroy();
    }
}

testPassword();