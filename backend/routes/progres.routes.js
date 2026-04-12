const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { meu, skillTree } = require('../controllers/progres.controller');

router.get('/meu',        verificarToken, meu);
router.get('/skill-tree', verificarToken, skillTree);

module.exports = router;
