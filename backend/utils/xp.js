const { XP_MULTIPLIER } = require('../data/skillTree');

// Rang thresholds (from GAMIFICATION.md)
const RANGS = [
  { min: 1,  max: 10, rang: 'novici' },
  { min: 11, max: 20, rang: 'aprenent' },
  { min: 21, max: 30, rang: 'guerrer' },
  { min: 31, max: 40, rang: 'campió' },
  { min: 41, max: 50, rang: 'mestre' },
];

// XP required to go from level n to level n+1
function xpPerNivell(nivell) {
  return 50 + (nivell - 1) * 50;
}

// Calculate level from total accumulated XP
function calcularNivell(xp_total) {
  let nivell = 1;
  let acumulat = 0;
  while (nivell < 50) {
    const needed = xpPerNivell(nivell + 1);
    if (acumulat + needed > xp_total) break;
    acumulat += needed;
    nivell++;
  }
  return nivell;
}

function calcularRang(nivell) {
  for (const r of RANGS) {
    if (nivell >= r.min && nivell <= r.max) return r.rang;
  }
  return 'mestre';
}

// Calculate XP earned for a completed session (from GAMIFICATION.md)
// @param {string} materia   - subject key ('mates', 'catala', etc.)
// @param {number} encerts   - correct answers (0–5)
// @param {number} rachaDies - current streak in days
// @param {number} totalMs   - sum of all response times in ms
function calcularXpSessio({ materia, encerts, rachaDies, totalMs }) {
  const mult = XP_MULTIPLIER[materia] || 1.0;

  let xp = 50; // XP_base per completed session
  xp += encerts * 10; // XP_bonus_encert

  // Streak bonus
  if (rachaDies >= 7)      xp = Math.floor(xp * 1.25);
  else if (rachaDies >= 3) xp = Math.floor(xp * 1.10);

  // Speed bonus: average response time under 20 seconds
  if (totalMs > 0 && (totalMs / 5) < 20000) xp += 10;

  return Math.floor(xp * mult);
}

module.exports = { calcularNivell, calcularRang, calcularXpSessio };
