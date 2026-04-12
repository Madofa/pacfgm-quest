const { calcularNivell, calcularRang, calcularXpSessio } = require('../utils/xp');

describe('calcularNivell', () => {
  it('comença al nivell 1 amb 0 XP', () => {
    expect(calcularNivell(0)).toBe(1);
  });

  it('puja de nivell amb suficient XP', () => {
    // Nivell 2 requereix 100 XP (xpPerNivell(2) = 50 + 50 = 100)
    expect(calcularNivell(100)).toBe(2);
  });

  it('no supera el nivell 50', () => {
    expect(calcularNivell(999999)).toBe(50);
  });
});

describe('calcularRang', () => {
  it('nivell 1 → novici', () => expect(calcularRang(1)).toBe('novici'));
  it('nivell 11 → aprenent', () => expect(calcularRang(11)).toBe('aprenent'));
  it('nivell 21 → guerrer', () => expect(calcularRang(21)).toBe('guerrer'));
  it('nivell 31 → campió', () => expect(calcularRang(31)).toBe('campió'));
  it('nivell 41 → mestre', () => expect(calcularRang(41)).toBe('mestre'));
});

describe('calcularXpSessio', () => {
  it('sessió bàsica (3 encerts, sense racha)', () => {
    const xp = calcularXpSessio({ materia: 'social', encerts: 3, rachaDies: 0, totalMs: 0 });
    expect(xp).toBe(80); // 50 base + 3*10
  });

  it('aplica multiplicador de mates (x1.5)', () => {
    const xp = calcularXpSessio({ materia: 'mates', encerts: 5, rachaDies: 0, totalMs: 0 });
    expect(xp).toBe(Math.floor(100 * 1.5)); // (50 + 50) * 1.5
  });

  it('aplica bonus racha ≥ 3 dies (x1.1)', () => {
    const xp = calcularXpSessio({ materia: 'social', encerts: 5, rachaDies: 3, totalMs: 0 });
    expect(xp).toBe(Math.floor(100 * 1.10));
  });

  it('aplica bonus racha ≥ 7 dies (x1.25)', () => {
    const xp = calcularXpSessio({ materia: 'social', encerts: 5, rachaDies: 7, totalMs: 0 });
    expect(xp).toBe(Math.floor(100 * 1.25));
  });

  it('aplica bonus velocitat si promig < 20s', () => {
    const xp = calcularXpSessio({ materia: 'social', encerts: 0, rachaDies: 0, totalMs: 50000 }); // 10s/preg
    expect(xp).toBe(60); // 50 base + 10 speed
  });
});
