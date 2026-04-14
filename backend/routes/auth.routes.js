const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { loginLimiter, registerLimiter, forgotPasswordLimiter, checkAliasLimiter } = require('../middleware/rateLimiter.middleware');
const { register, login, me, forgotPassword, resetPassword, verificarEmail, actualitzarPerfil, checkAlias } = require('../controllers/auth.controller');

router.post('/register',        registerLimiter, register);
router.post('/login',           loginLimiter, login);
router.get('/me',               verificarToken, me);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password',  resetPassword);
router.get('/verificar-email',  verificarEmail);
router.patch('/perfil',         verificarToken, actualitzarPerfil);
router.get('/check-alias',      checkAliasLimiter, checkAlias);

module.exports = router;
