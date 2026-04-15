/**
 * renderMath — Converteix notació matemàtica plana a HTML visual
 *
 * Transforma patrons com (2/3)^3 → (²⁄₃)³ o amb <sup>/<sub>
 * S'usa als components que mostren preguntes i opcions de resposta.
 *
 * Retorna un string HTML segur (escapa entitats HTML primer).
 */

// Escapa caràcters HTML per evitar XSS
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Converteix text matemàtic pla a HTML amb superíndexs i fraccions visuals.
 * Exemples:
 *   (2/3)^3  →  (2/3)<sup>3</sup>
 *   x^2      →  x<sup>2</sup>
 *   2^10     →  2<sup>10</sup>
 *   m/s^2    →  m/s<sup>2</sup>
 */
export function renderMath(text) {
  if (!text) return '';

  let s = escapeHtml(text);

  // Superíndexs: qualsevol cosa^N → cosa<sup>N</sup>
  // Suporta números i expressions simples com exponent
  s = s.replace(/\^(-?\d+)/g, '<sup>$1</sup>');

  // Fraccions inline entre parèntesis: (a/b) → fracció visual CSS
  // Exemples: (2/3), (3/4), (1/2)
  s = s.replace(/\((\d+)\/(\d+)\)/g, '<span class="frac">(<span class="frac-num">$1</span>/<span class="frac-den">$2</span>)</span>');

  return s;
}
