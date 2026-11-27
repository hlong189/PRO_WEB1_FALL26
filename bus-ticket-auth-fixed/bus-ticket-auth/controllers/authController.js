
import db from '../config/database.js';
import bcrypt from 'bcrypt';

export async function register(req, res) {
    try {
        const fullName = String(req.body.full_name || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const phone = String(req.body.phone || '').trim();
        const password = String(req.body.password || '');

        // Kiem tra cac truong bat buoc
        if (!fullName || !email || !phone || !password) {
            return res.status(400).render('auth/register', {
                error: 'Vui long nhap day du thong tin!'
            });
        }

        // Kiem tra dinh dang email co ban
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return res.status(400).render('auth/register', {
                error: 'Email khong hop le!'
            });
        }

        // Kiem tra do dai mat khau
        if (password.length < 8) {
            return res.status(400).render('auth/register', {
                error: 'Mat khau phai co it nhat 8 ky tu!'
            });
        }

        // Kiem tra do dai thong tin
        if (fullName.length > 150 || email.length > 255 || phone.length > 20) {
            return res.status(400).render('auth/register', {
                error: 'Thong tin nhap vuot qua do dai cho phep!'
            });
        }

        // Kiem tra email da ton tai
        const existingUser = await db('users')
            .where({ email })
            .first();

        if (existingUser) {
            return res.status(400).render('auth/register', {
                error: 'Email nay da duoc dang ky!'
            });
        }

        // Bam mat khau bang bcrypt truoc khi luu
        const passwordHash = await bcrypt.hash(password, 10);

        // Tao tai khoan va gan quyen Customer
        await db.transaction(async (trx) => {
            const customerRole = await trx('roles')
                .where({ name: 'customer' })
                .first();

            if (!customerRole) {
                throw new Error('Khong tim thay quyen customer trong bang roles!');
            }

            const [user] = await trx('users')
                .insert({
                    full_name: fullName,
                    email,
                    phone,
                    password_hash: passwordHash,
                    is_verified: false,
                    is_active: true
                })
                .returning('id');

            await trx('user_roles').insert({
                user_id: user.id,
                role_id: customerRole.id
            });
        });

        // Hien thi trang dang ky thanh cong
        return res.status(201).render('auth/register-success', {
            email: email
        });

    } catch (error) {
        // Xu ly truong hop trung email
        if (error.code === '23505') {
            return res.status(409).render('auth/register', {
                error: 'Email nay da duoc dang ky!'
            });
        }

        console.error('Loi dang ky:', error);

        return res.status(500).render('auth/register', {
            error: 'Dang ky that bai. Vui long thu lai!'
        });
    }
}
