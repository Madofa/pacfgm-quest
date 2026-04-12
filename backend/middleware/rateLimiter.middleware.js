const rateLimit = require('express-rate-limit');

// Max 60 question generation requests per user per hour.
// Gemini free tier: ~1000/day ≈ 41/hour globally — this keeps one user from consuming everything.
const geminiLimiter = rateLimit({
  windowMs:       60 * 60 * 1000, // 1 hour
  max:            60,
  message:        { error: 'Has arribat al límit de preguntes per hora. Torna-ho a intentar en 1 hora.' },
  keyGenerator:   (req) => String(req.usuari?.id || req.ip),
  standardHeaders: true,
  legacyHeaders:  false,
});

module.exports = { geminiLimiter };
