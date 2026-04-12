const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { geminiLimiter } = require('../middleware/rateLimiter.middleware');
const { generar, resposta, finalitzar } = require('../controllers/pregunta.controller');

router.post('/generar',    verificarToken, geminiLimiter, generar);
router.post('/resposta',   verificarToken, resposta);
router.post('/finalitzar', verificarToken, finalitzar);

module.exports = router;
