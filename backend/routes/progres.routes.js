const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { meu, skillTree, revisionsAvui, srDots, errorsRecents } = require('../controllers/progres.controller');

router.get('/meu',            verificarToken, meu);
router.get('/skill-tree',     verificarToken, skillTree);
router.get('/revisions',      verificarToken, revisionsAvui);
router.get('/sr-dots',        verificarToken, srDots);
router.get('/errors-recents', verificarToken, errorsRecents);

module.exports = router;
