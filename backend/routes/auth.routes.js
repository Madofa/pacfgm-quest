const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { register, login, me } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login',    login);
router.get('/me',        verificarToken, me);

module.exports = router;
