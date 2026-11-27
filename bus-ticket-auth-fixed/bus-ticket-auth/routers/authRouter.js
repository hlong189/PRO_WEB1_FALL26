import express from 'express';
import { register } from '../controllers/authController.js';

const router = express.Router();

// Hien thi giao dien dang ky
router.get('/register', (req, res) => {
    res.render('auth/register');
});

// Xu ly du lieu dang ky
router.post('/register', register);

export default router;