// Single source of truth for all skill tree nodes.
// Each node: id, titol, materia, pare (parent id or null), fills (child ids), temari (for Gemini prompt)

const NODES = {
  // ── MATEMÀTIQUES (materia: 'mates', xp_multiplier: 1.5) ──────────────
  'mates-numeros': {
    id: 'mates-numeros',
    titol: 'Nombres i operacions',
    materia: 'mates',
    pare: null,
    fills: ['mates-fraccions'],
    temari: "Nombres enters, decimals, potències, arrels quadrades, operacions bàsiques, prioritat d'operacions. Nivell ESO bàsic.",
  },
  'mates-fraccions': {
    id: 'mates-fraccions',
    titol: 'Fraccions',
    materia: 'mates',
    pare: 'mates-numeros',
    fills: ['mates-percentatges'],
    temari: 'Fraccions equivalents, simplificació, operacions amb fraccions (suma, resta, multiplicació, divisió), nombres mixtos.',
  },
  'mates-percentatges': {
    id: 'mates-percentatges',
    titol: 'Percentatges',
    materia: 'mates',
    pare: 'mates-fraccions',
    fills: ['mates-proporcionalitat'],
    temari: 'Càlcul de percentatges, augments i disminucions percentuals, IVA, descomptes.',
  },
  'mates-proporcionalitat': {
    id: 'mates-proporcionalitat',
    titol: 'Proporcionalitat',
    materia: 'mates',
    pare: 'mates-percentatges',
    fills: ['mates-algebra'],
    temari: 'Regla de tres simple i composta, proporcionalitat directa i inversa, repartiments proporcionals.',
  },
  'mates-algebra': {
    id: 'mates-algebra',
    titol: 'Àlgebra bàsica',
    materia: 'mates',
    pare: 'mates-proporcionalitat',
    fills: ['mates-equacions'],
    temari: 'Expressions algebraiques, monoms i polinoms, operacions amb polinoms.',
  },
  'mates-equacions': {
    id: 'mates-equacions',
    titol: 'Equacions',
    materia: 'mates',
    pare: 'mates-algebra',
    fills: ['mates-funcions'],
    temari: 'Equacions de primer i segon grau, sistemes de dues equacions amb dues incògnites.',
  },
  'mates-funcions': {
    id: 'mates-funcions',
    titol: 'Funcions i gràfiques',
    materia: 'mates',
    pare: 'mates-equacions',
    fills: [],
    temari: 'Concepte de funció, taula de valors, representació gràfica, funcions lineals i quadràtiques.',
  },

  // ── CATALÀ (materia: 'catala', xp_multiplier: 1.0) ───────────────────
  'catala-comprensio': {
    id: 'catala-comprensio',
    titol: 'Comprensió lectora',
    materia: 'catala',
    pare: null,
    fills: ['catala-gramatica'],
    temari: 'Comprensió de textos escrits en català: idea principal, idees secundàries, vocabulari en context.',
  },
  'catala-gramatica': {
    id: 'catala-gramatica',
    titol: 'Gramàtica bàsica',
    materia: 'catala',
    pare: 'catala-comprensio',
    fills: ['catala-expressio'],
    temari: 'Morfologia: categories gramaticals, verbs (conjugació present, passat, futur), concordança.',
  },
  'catala-expressio': {
    id: 'catala-expressio',
    titol: 'Expressió escrita',
    materia: 'catala',
    pare: 'catala-gramatica',
    fills: [],
    temari: 'Tipologies textuals, coherència i cohesió, connectors textuals, ortografia bàsica en català.',
  },

  // ── CASTELLÀ (materia: 'castella', xp_multiplier: 1.0) ───────────────
  'castella-comprensio': {
    id: 'castella-comprensio',
    titol: 'Comprensión lectora',
    materia: 'castella',
    pare: null,
    fills: ['castella-gramatica'],
    temari: 'Comprensión de textos escritos en castellano: idea principal, vocabulario en contexto, inferencias.',
  },
  'castella-gramatica': {
    id: 'castella-gramatica',
    titol: 'Gramática básica',
    materia: 'castella',
    pare: 'castella-comprensio',
    fills: ['castella-expressio'],
    temari: 'Morfología: categorías gramaticales, conjugación verbal, concordancia, signos de puntuación.',
  },
  'castella-expressio': {
    id: 'castella-expressio',
    titol: 'Expresión escrita',
    materia: 'castella',
    pare: 'castella-gramatica',
    fills: [],
    temari: 'Tipos de texto, coherencia y cohesión, conectores, ortografía básica en castellano.',
  },

  // ── ANGLÈS (materia: 'angles', xp_multiplier: 1.0) ───────────────────
  'angles-comprensio': {
    id: 'angles-comprensio',
    titol: 'Reading comprehension',
    materia: 'angles',
    pare: null,
    fills: ['angles-gramatica'],
    temari: 'Reading comprehension in English: main idea, vocabulary in context, simple and compound sentences.',
  },
  'angles-gramatica': {
    id: 'angles-gramatica',
    titol: 'Grammar basics',
    materia: 'angles',
    pare: 'angles-comprensio',
    fills: ['angles-vocabulari'],
    temari: 'English grammar: present simple, present continuous, past simple, future (will/going to), question forms.',
  },
  'angles-vocabulari': {
    id: 'angles-vocabulari',
    titol: 'Vocabulary & expressions',
    materia: 'angles',
    pare: 'angles-gramatica',
    fills: [],
    temari: 'Everyday English vocabulary, common expressions, phrasal verbs, false friends with Spanish/Catalan.',
  },

  // ── CIÈNCIES (materia: 'ciencies', xp_multiplier: 1.3) ───────────────
  'ciencies-materia': {
    id: 'ciencies-materia',
    titol: 'La matèria',
    materia: 'ciencies',
    pare: null,
    fills: ['ciencies-energia'],
    temari: "Propietats de la matèria, estats de la matèria, canvis d'estat, mescles i substàncies pures, taula periòdica bàsica.",
  },
  'ciencies-energia': {
    id: 'ciencies-energia',
    titol: "L'energia",
    materia: 'ciencies',
    pare: 'ciencies-materia',
    fills: ['ciencies-terra'],
    temari: "Tipus d'energia, transformacions energètiques, energia renovable i no renovable, estalvi energètic.",
  },
  'ciencies-terra': {
    id: 'ciencies-terra',
    titol: 'La Terra i el medi ambient',
    materia: 'ciencies',
    pare: 'ciencies-energia',
    fills: [],
    temari: "Estructura de la Terra, tectònica de plaques, ecosistemes, cadenes tròfiques, problemes mediambientals.",
  },

  // ── TECNOLOGIA (materia: 'tecnologia', xp_multiplier: 1.1) ───────────
  'tecnologia-materials': {
    id: 'tecnologia-materials',
    titol: 'Materials i eines',
    materia: 'tecnologia',
    pare: null,
    fills: ['tecnologia-electricitat'],
    temari: 'Propietats dels materials (metalls, plàstics, fustes), eines bàsiques de taller, normes de seguretat.',
  },
  'tecnologia-electricitat': {
    id: 'tecnologia-electricitat',
    titol: 'Electricitat bàsica',
    materia: 'tecnologia',
    pare: 'tecnologia-materials',
    fills: ['tecnologia-tic'],
    temari: "Corrent elèctric, circuits en sèrie i paral·lel, llei d'Ohm, components elèctrics bàsics (resistències, condensadors).",
  },
  'tecnologia-tic': {
    id: 'tecnologia-tic',
    titol: 'TIC i internet',
    materia: 'tecnologia',
    pare: 'tecnologia-electricitat',
    fills: [],
    temari: 'Hardware i software, xarxes informàtiques, internet i seguretat digital, ofimàtica bàsica.',
  },

  // ── SOCIAL (materia: 'social', xp_multiplier: 1.0) ───────────────────
  'social-historia': {
    id: 'social-historia',
    titol: 'Història contemporània',
    materia: 'social',
    pare: null,
    fills: ['social-geografia'],
    temari: 'Segle XX: guerres mundials, la guerra civil espanyola, la transició democràtica, la Unió Europea.',
  },
  'social-geografia': {
    id: 'social-geografia',
    titol: 'Geografia i societat',
    materia: 'social',
    pare: 'social-historia',
    fills: [],
    temari: "Mapes, relleu i clima d'Espanya i Catalunya, sectors econòmics, problemes socials contemporanis.",
  },
};

// Root nodes (pare === null) — set to 'disponible' on user registration
const ROOT_NODES = Object.values(NODES)
  .filter(n => n.pare === null)
  .map(n => n.id);

// XP multiplier per subject
const XP_MULTIPLIER = {
  mates:      1.5,
  ciencies:   1.3,
  tecnologia: 1.1,
  catala:     1.0,
  castella:   1.0,
  angles:     1.0,
  social:     1.0,
};

module.exports = { NODES, ROOT_NODES, XP_MULTIPLIER };
