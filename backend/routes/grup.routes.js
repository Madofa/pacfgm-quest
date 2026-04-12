const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { leaderboard, progresGrup } = require('../controllers/grup.controller');

router.get('/leaderboard', verificarToken, leaderboard);
router.get('/progres',     verificarToken, progresGrup);

module.exports = router;
