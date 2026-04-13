const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { leaderboard, progresGrup, crearGrup, unirGrup, elsMemsGrups } = require('../controllers/grup.controller');

router.get('/leaderboard', verificarToken, leaderboard);
router.get('/progres',     verificarToken, progresGrup);
router.post('/crear',      verificarToken, crearGrup);
router.post('/unir',       verificarToken, unirGrup);
router.get('/meus',        verificarToken, elsMemsGrups);

module.exports = router;
