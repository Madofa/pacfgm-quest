const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { geminiLimiter } = require('../middleware/rateLimiter.middleware');
const { generar, resposta, finalitzar, explicar, analitzarImatge } = require('../controllers/pregunta.controller');

router.post('/generar',          verificarToken, geminiLimiter, generar);
router.post('/resposta',         verificarToken, resposta);
router.post('/finalitzar',       verificarToken, finalitzar);
router.post('/explicar',         verificarToken, geminiLimiter, explicar);
router.post('/analitzar-imatge', verificarToken, geminiLimiter, analitzarImatge);

module.exports = router;
