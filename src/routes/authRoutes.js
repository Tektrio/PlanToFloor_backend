const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting específico para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // limite de 5 tentativas por 15 minutos
  standardHeaders: true,
  message: {
    success: false,
    message: 'Muitas tentativas de login, tente novamente mais tarde'
  }
});

// Rotas públicas com proteção contra brute force
router.post('/login', authLimiter, authController.login);
router.post('/register', authLimiter, authController.register);

// Rotas protegidas
router.get('/me', protect, authController.getMe);
router.put('/update', protect, authController.updateUser);

module.exports = router;