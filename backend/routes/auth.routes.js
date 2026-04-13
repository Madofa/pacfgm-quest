const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { register, login, me, forgotPassword, resetPassword, verificarEmail, actualitzarPerfil, checkAlias } = require('../controllers/auth.controller');

router.post('/register',        register);
router.post('/login',           login);
router.get('/me',               verificarToken, me);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);
router.get('/verificar-email',  verificarEmail);
router.patch('/perfil',         verificarToken, actualitzarPerfil);
router.get('/check-alias',      checkAlias);

module.exports = router;
