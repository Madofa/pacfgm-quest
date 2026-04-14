const rateLimit = require('express-rate-limit');

// ── Gemini (per usuari autenticat) ────────────────────────────────────────────
// 60 generacions per hora — evita que un usuari esgoti la quota global
const geminiLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             60,
  message:         { error: 'Has arribat al límit de preguntes per hora. Torna-ho a intentar en 1 hora.' },
  keyGenerator:    (req) => String(req.usuari?.id || req.ip),
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Login (per IP) ────────────────────────────────────────────────────────────
// 10 intents per 15 minuts — evita força bruta de contrasenyes
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  message:         { error: 'Massa intents d\'accés. Espera 15 minuts i torna-ho a intentar.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true, // No comptar logins correctes
});

// ── Registre (per IP) ─────────────────────────────────────────────────────────
// 5 registres per hora — evita creació massiva de comptes
const registerLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  message:         { error: 'Massa registres des d\'aquesta adreça. Espera 1 hora.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Forgot password (per IP) ──────────────────────────────────────────────────
// 5 peticions per hora — evita bombardeig d'emails amb la quota SMTP
const forgotPasswordLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  message:         { error: 'Massa sol·licituds de recuperació. Espera 1 hora.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Check alias (per IP) ──────────────────────────────────────────────────────
// 60 comprovacions per minut — evita enumeració d'àlies per bots
const checkAliasLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             60,
  message:         { error: 'Massa consultes d\'àlies. Espera 1 minut.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

module.exports = { geminiLimiter, loginLimiter, registerLimiter, forgotPasswordLimiter, checkAliasLimiter };
