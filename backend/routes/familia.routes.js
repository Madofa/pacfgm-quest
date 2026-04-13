const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { geminiLimiter } = require('../middleware/rateLimiter.middleware');
const { soloPare, vincularFill, desvincularFill, getFills, informeFill } = require('../controllers/familia.controller');

router.post('/vincular',              verificarToken, soloPare, vincularFill);
router.get('/fills',                  verificarToken, soloPare, getFills);
router.delete('/fills/:fill_id',      verificarToken, soloPare, desvincularFill);
router.get('/informe/:fill_id',       verificarToken, soloPare, geminiLimiter, informeFill);

module.exports = router;
