const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { meu, skillTree, revisionsAvui, srDots, errorsRecents, errorsCount, retencioSR, memoriaStats, ultimesMillores } = require('../controllers/progres.controller');

router.get('/meu',            verificarToken, meu);
router.get('/skill-tree',     verificarToken, skillTree);
router.get('/revisions',      verificarToken, revisionsAvui);
router.get('/sr-dots',        verificarToken, srDots);
router.get('/errors-recents', verificarToken, errorsRecents);
router.get('/errors-count',   verificarToken, errorsCount);
router.get('/retencio',       verificarToken, retencioSR);
router.get('/memoria',         verificarToken, memoriaStats);
router.get('/ultimes-millores', verificarToken, ultimesMillores);

module.exports = router;
