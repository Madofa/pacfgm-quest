const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { enviar } = require('../controllers/feedback.controller');

router.post('/', verificarToken, enviar);

module.exports = router;
