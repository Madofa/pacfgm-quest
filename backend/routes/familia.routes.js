const router = require('express').Router();
const { verificarToken } = require('../middleware/auth.middleware');
const { geminiLimiter } = require('../middleware/rateLimiter.middleware');
const {
  soloPare, vincularFill, cancellarPeticio, desvincularFill,
  getFills, getPeticionsRebudes, acceptarPeticio, rebutjarPeticio, informeFill,
} = require('../controllers/familia.controller');

// Pare
router.post('/vincular',                    verificarToken, soloPare, vincularFill);
router.get('/fills',                        verificarToken, soloPare, getFills);
router.delete('/fills/:fill_id',            verificarToken, soloPare, desvincularFill);
router.delete('/peticions/:fill_id',        verificarToken, soloPare, cancellarPeticio);
router.get('/informe/:fill_id',             verificarToken, soloPare, geminiLimiter, informeFill);

// Alumne
router.get('/peticions-rebudes',            verificarToken, getPeticionsRebudes);
router.patch('/peticions/:pare_id/aprovar', verificarToken, acceptarPeticio);
router.delete('/peticions/:pare_id/rebutjar', verificarToken, rebutjarPeticio);

module.exports = router;
