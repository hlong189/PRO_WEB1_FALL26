import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import db from './config/database.js';
import authRouter from './routers/authRouter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SESSION_SECRET) {
    throw new Error('Thieu SESSION_SECRET trong file .env');
}

// Cau hinh EJS
app.set('view engine', 'ejs');
app.set('views', './views');

// Doc du lieu tu form
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cau hinh session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// Su dung router
app.use(authRouter);

// Trang chu
app.get('/', (req, res) => {
    res.send('Bus Ticket Booking System - Server is running!');
});

// Khoi dong server
async function startServer() {
    try {
        await db.raw('SELECT 1');

        console.log('Ket noi PostgreSQL thanh cong!');

        app.listen(PORT, () => {
            console.log(`Server dang chay tai http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Loi ket noi PostgreSQL:', error.message);
        process.exit(1);
    }
}

startServer();