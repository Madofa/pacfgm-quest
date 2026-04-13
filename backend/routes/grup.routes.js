const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { geminiLimiter } = require('../middleware/rateLimiter.middleware');
const {
  leaderboard, progresGrup, crearGrup, unirGrup, elsMemsGrups,
  peticionsPendents, aprovarMembre, rebutjarMembre, eliminarMembre,
  informeAlumne,
} = require('../controllers/grup.controller');

router.get('/leaderboard',                    verificarToken, leaderboard);
router.get('/progres',                        verificarToken, progresGrup);
router.post('/crear',                         verificarToken, crearGrup);
router.post('/unir',                          verificarToken, unirGrup);
router.get('/meus',                           verificarToken, elsMemsGrups);
router.get('/peticions',                      verificarToken, peticionsPendents);
router.patch('/peticions/:alumne_id/aprovar', verificarToken, aprovarMembre);
router.delete('/peticions/:alumne_id',        verificarToken, rebutjarMembre);
router.delete('/membres/:alumne_id',          verificarToken, eliminarMembre);
router.get('/informe/:alumne_id',             verificarToken, geminiLimiter, informeAlumne);

module.exports = router;
