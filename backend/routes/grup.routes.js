const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { geminiLimiter } = require('../middleware/rateLimiter.middleware');
const { leaderboard, progresGrup, crearGrup, unirGrup, elsMemsGrups, informeAlumne } = require('../controllers/grup.controller');

router.get('/leaderboard',             verificarToken, leaderboard);
router.get('/progres',                 verificarToken, progresGrup);
router.post('/crear',                  verificarToken, crearGrup);
router.post('/unir',                   verificarToken, unirGrup);
router.get('/meus',                    verificarToken, elsMemsGrups);
router.get('/informe/:alumne_id',      verificarToken, geminiLimiter, informeAlumne);

module.exports = router;
