/**
 * importar-preguntes-oficials.js
 *
 * 1. Afegeix la columna font_oficial a preguntes_bank (si no existeix)
 * 2. Insereix les preguntes REALS extretes dels exàmens PACFGM publicats
 *    pel Departament d'Educació de la Generalitat de Catalunya (2024)
 *
 * Ús:  node scripts/importar-preguntes-oficials.js
 */

require('dotenv').config({ override: true });
const mysql = require('mysql2/promise');

// ── Preguntes reals de l'examen PACFGM 2024 ──────────────────────────────────
// Format: { node_id, pregunta_text, opcions, resposta_correcta, explicacio }
// Les opcions inclouen la lletra (ex: "A. ...")

const PREGUNTES_OFICIALS = [

  // ── MATEMÀTIQUES ───────────────────────────────────────────────────────────

  {
    node_id: 'mates-geometria',
    pregunta_text: 'Quant mesura el perímetre d\'una roda de radi 60 cm?',
    opcions: ['A. 120 cm', 'B. 188,50 cm', 'C. 376,99 cm', 'D. 11.310 cm'],
    resposta_correcta: 'C',
    explicacio: 'P = 2·π·r = 2·π·60 ≈ 376,99 cm. (La circumferència es calcula multiplicant 2π pel radi.)',
  },
  {
    node_id: 'mates-geometria',
    pregunta_text: 'Quant mesura el perímetre d\'una roda de radi 25 cm?',
    opcions: ['A. 50 cm', 'B. 78,54 cm', 'C. 157,08 cm', 'D. 1.963 cm'],
    resposta_correcta: 'C',
    explicacio: 'P = 2·π·r = 2·π·25 ≈ 157,08 cm.',
  },
  {
    node_id: 'mates-nombres',
    pregunta_text: 'Calcula: (-3) + (+5) - (-7) + (-12)',
    opcions: ['A. -3', 'B. +3', 'C. -9', 'D. +9'],
    resposta_correcta: 'A',
    explicacio: '(-3)+(+5) = 2; 2-(-7) = 2+7 = 9; 9+(-12) = -3.',
  },
  {
    node_id: 'mates-equacions',
    pregunta_text: 'És x = 3 solució de l\'equació 2x - 5x + 7 = -2?',
    opcions: [
      'A. Sí, perquè substituint x = 3 el resultat és -2',
      'B. No, perquè el resultat és +2',
      'C. No, perquè el resultat és 0',
      'D. Sí, però x = -3 també és solució',
    ],
    resposta_correcta: 'A',
    explicacio: '2·3 - 5·3 + 7 = 6 - 15 + 7 = -2. Sí, x = 3 és solució.',
  },
  {
    node_id: 'mates-estadistica',
    pregunta_text: 'En una enquesta a 700 persones, el 35% valora el servei com a satisfactori. Quantes persones és això?',
    opcions: ['A. 35', 'B. 70', 'C. 175', 'D. 245'],
    resposta_correcta: 'D',
    explicacio: '35% de 700 = 700 × 0,35 = 245 persones.',
  },
  {
    node_id: 'mates-mesures',
    pregunta_text: 'Una recepta necessita 5 L de base, 1,5 L de brou, 2 ampolles de 0,75 L i 0,6 L d\'oli. Quants litres en total?',
    opcions: ['A. 7,0 L', 'B. 7,8 L', 'C. 8,6 L', 'D. 9,2 L'],
    resposta_correcta: 'C',
    explicacio: '5 + 1,5 + (2 × 0,75) + 0,6 = 5 + 1,5 + 1,5 + 0,6 = 8,6 L.',
  },

  // ── CATALÀ ─────────────────────────────────────────────────────────────────

  {
    node_id: 'catala-comprensio',
    pregunta_text: 'Quin és el sinònim del verb "salpar"?',
    opcions: ['A. Fondre', 'B. Partir', 'C. Amarrar', 'D. Ancorar'],
    resposta_correcta: 'B',
    explicacio: '"Salpar" significa treure l\'àncora i sortir del port; els seus sinònims són "partir" o "llevar àncores".',
  },
  {
    node_id: 'catala-gramatica',
    pregunta_text: 'Quina és la categoria gramatical de la paraula "també"?',
    opcions: ['A. Adjectiu', 'B. Preposició', 'C. Adverbi', 'D. Conjunció'],
    resposta_correcta: 'C',
    explicacio: '"També" és un adverbi d\'afirmació que modifica el verb o tota l\'oració.',
  },
  {
    node_id: 'catala-gramatica',
    pregunta_text: 'Quina és la categoria gramatical de "aquest" a la frase "aquest vaixell"?',
    opcions: [
      'A. Pronom relatiu',
      'B. Determinant demostratiu',
      'C. Adjectiu qualificatiu',
      'D. Article definit',
    ],
    resposta_correcta: 'B',
    explicacio: '"Aquest" és un determinant demostratiu que indica proximitat al parlant.',
  },
  {
    node_id: 'catala-gramatica',
    pregunta_text: 'Quina és la categoria gramatical de "sec" a la frase "el clima és sec"?',
    opcions: ['A. Adverbi', 'B. Substantiu', 'C. Adjectiu', 'D. Verb'],
    resposta_correcta: 'C',
    explicacio: '"Sec" és un adjectiu qualificatiu que atribueix una qualitat al substantiu "clima".',
  },
  {
    node_id: 'catala-gramatica',
    pregunta_text: 'Quina és la categoria gramatical de la paraula "campanyes"?',
    opcions: ['A. Adjectiu', 'B. Verb', 'C. Determinant', 'D. Substantiu'],
    resposta_correcta: 'D',
    explicacio: '"Campanyes" és un substantiu femení plural (forma plural de "campanya").',
  },
  {
    node_id: 'catala-gramatica',
    pregunta_text: 'Quina és la categoria gramatical de la paraula "a" a la frase "va anar a Barcelona"?',
    opcions: ['A. Conjunció', 'B. Adverbi', 'C. Preposició', 'D. Article'],
    resposta_correcta: 'C',
    explicacio: '"A" en aquest context és una preposició que introdueix el complement de lloc.',
  },

  // ── CASTELLÀ ───────────────────────────────────────────────────────────────

  {
    node_id: 'castella-comprensio',
    pregunta_text: '¿Qué era el "sicté" para los mayas, según el contexto histórico?',
    opcions: [
      'A. Un instrumento musical de cuerda',
      'B. Un chicle envuelto en hojas de maíz con usos ceremoniales',
      'C. Una técnica de construcción de templos',
      'D. Un ungüento medicinal',
    ],
    resposta_correcta: 'B',
    explicacio: 'El sicté era el chicle que usaban los mayas, envuelto en hojas de maíz para ceremonias religiosas.',
  },
  {
    node_id: 'castella-comprensio',
    pregunta_text: '¿Quién comercializó el chicle industrial a finales del siglo XIX con el nombre de Chiclets?',
    opcions: ['A. Wrigley', 'B. Nestlé', 'C. Adams', 'D. Carambar'],
    resposta_correcta: 'C',
    explicacio: 'Thomas Adams comercializó el chicle industrial a finales del siglo XIX con el nombre de Chiclets.',
  },

  // ── ANGLÈS ─────────────────────────────────────────────────────────────────

  {
    node_id: 'angles-gramatica',
    pregunta_text: 'Complete the sentence: "Clara ___ me she saw you at a party."',
    opcions: ['A. say', 'B. told', 'C. said to', 'D. tell'],
    resposta_correcta: 'B',
    explicacio: '"Told" és el passat de "tell" i va seguit de pronom objecte. "Said" va seguit de "that", no de pronom.',
  },
  {
    node_id: 'angles-gramatica',
    pregunta_text: 'Complete the sentence: "I haven\'t seen you ___ high school."',
    opcions: ['A. since', 'B. for', 'C. during', 'D. from'],
    resposta_correcta: 'A',
    explicacio: '"Since" s\'usa amb un punt de temps específic (high school). "For" s\'usa amb períodes de temps (two years).',
  },
  {
    node_id: 'angles-gramatica',
    pregunta_text: 'Complete the sentence: "You ___ come and visit us!"',
    opcions: ['A. should', 'B. can', 'C. would', 'D. must'],
    resposta_correcta: 'D',
    explicacio: '"Must" expressa obligació o recomanació forta. En context col·loquial pot expressar una invitació molt directa.',
  },
  {
    node_id: 'angles-comprensio',
    pregunta_text: 'What is the best response to: "Excuse me, can I talk to you?"',
    opcions: [
      'A. I\'m sorry, I\'m busy right now.',
      'B. Yes, I can.',
      'C. No, I am not.',
      'D. Thank you for asking.',
    ],
    resposta_correcta: 'A',
    explicacio: 'La resposta A és la més natural en anglès: reconeix la petició i dona una resposta educada.',
  },
  {
    node_id: 'angles-expressio',
    pregunta_text: 'What is the most natural answer to: "What is your hobby?"',
    opcions: [
      'A. I\'m keen on travelling.',
      'B. I hobby sports.',
      'C. My hobby is very well.',
      'D. I am a hobby.',
    ],
    resposta_correcta: 'A',
    explicacio: '"Keen on + gerundi" és una expressió fixa anglesa per expressar aficions. Les altres opcions són incorrectes gramaticalment.',
  },

  // ── CIÈNCIES ───────────────────────────────────────────────────────────────

  {
    node_id: 'ciencies-forces',
    pregunta_text: 'Quina és la velocitat equivalent a 10 km/h expressada en m/s?',
    opcions: ['A. 0,28 m/s', 'B. 0,36 m/s', 'C. 2,78 m/s', 'D. 3,60 m/s'],
    resposta_correcta: 'C',
    explicacio: '10 km/h × (1.000 m / 3.600 s) = 2,78 m/s. Per passar de km/h a m/s es divideix entre 3,6.',
  },
  {
    node_id: 'ciencies-quimica',
    pregunta_text: 'Quina és la massa molecular de l\'àcid cítric (C₆H₈O₇)?',
    opcions: ['A. 142 g/mol', 'B. 172 g/mol', 'C. 192 g/mol', 'D. 210 g/mol'],
    resposta_correcta: 'C',
    explicacio: '(6·12) + (8·1) + (7·16) = 72 + 8 + 112 = 192 g/mol.',
  },
  {
    node_id: 'ciencies-quimica',
    pregunta_text: 'Quina és la massa molecular del bicarbonat de sodi (NaHCO₃)?',
    opcions: ['A. 72 g/mol', 'B. 80 g/mol', 'C. 84 g/mol', 'D. 98 g/mol'],
    resposta_correcta: 'C',
    explicacio: 'Na(23) + H(1) + C(12) + 3·O(3·16=48) = 23 + 1 + 12 + 48 = 84 g/mol.',
  },
  {
    node_id: 'ciencies-materia',
    pregunta_text: 'El raïm té una densitat de 1,2 g/cm³. Si el posem a l\'aigua (densitat 1,0 g/cm³), què passa?',
    opcions: [
      'A. Sura, perquè és un aliment lleuger',
      'B. S\'enfonsa, perquè la seva densitat és major que la de l\'aigua',
      'C. Flota a mig camí entre la superfície i el fons',
      'D. Sura parcialment, amb la meitat fora de l\'aigua',
    ],
    resposta_correcta: 'B',
    explicacio: 'Un cos s\'enfonsa si la seva densitat és major que la del fluid. El raïm (1,2 g/cm³) > aigua (1,0 g/cm³), per tant s\'enfonsa.',
  },

  // ── TECNOLOGIA ─────────────────────────────────────────────────────────────

  {
    node_id: 'tecnologia-materials',
    pregunta_text: 'En un plànol, la cota A = 15 cm i la cota B = 2·A = 30 cm. Si C = 2A + B, quant mesura C?',
    opcions: ['A. 15 cm', 'B. 30 cm', 'C. 45 cm', 'D. 60 cm'],
    resposta_correcta: 'D',
    explicacio: 'C = 2·A + B = 2·15 + 30 = 30 + 30 = 60 cm.',
  },
  {
    node_id: 'tecnologia-electricitat',
    pregunta_text: 'Quina és la tensió als extrems d\'una resistència d\'1 kΩ si hi circula un corrent d\'1 μA?',
    opcions: ['A. 1 nV', 'B. 1 μV', 'C. 1 mV', 'D. 1 V'],
    resposta_correcta: 'C',
    explicacio: 'Llei d\'Ohm: V = R·I = 1.000 Ω × 0,000001 A = 0,001 V = 1 mV.',
  },
  {
    node_id: 'tecnologia-materials',
    pregunta_text: 'Un objecte rep forces perpendiculars iguals des de dalt i des de sota sobre el seu centre. Quin esforç pateix?',
    opcions: ['A. Tracció', 'B. Flexió', 'C. Compressió', 'D. Torsió'],
    resposta_correcta: 'B',
    explicacio: 'La flexió es produeix quan forces perpendiculars a l\'eix tendeixen a doblegar el material.',
  },
  {
    node_id: 'tecnologia-maquines',
    pregunta_text: 'Quin mecanisme converteix el moviment circular en moviment rectilini alternatiu?',
    opcions: ['A. Biela-manovella', 'B. Engranatge', 'C. Pinyó-cremallera', 'D. Tren de politges'],
    resposta_correcta: 'A',
    explicacio: 'La biela-manovella transforma el gir del motor (circular) en moviment d\'anada i tornada (rectilini alternatiu).',
  },
  {
    node_id: 'tecnologia-tic',
    pregunta_text: 'Quin tipus de fitxers del navegador web guarda els hàbits i les preferències de navegació de l\'usuari?',
    opcions: ['A. Historial', 'B. Tallafocs', 'C. Galetes', 'D. Contrasenyes'],
    resposta_correcta: 'C',
    explicacio: 'Les galetes (cookies) emmagatzemen informació sobre la navegació, preferències i inicis de sessió.',
  },
  {
    node_id: 'tecnologia-electricitat',
    pregunta_text: 'Una bateria de 17,6 kWh es carrega un cop per setmana. Si el preu de l\'electricitat és 18,94 c€/kWh, quin és el cost anual (52 setmanes)?',
    opcions: ['A. 173,3 €', 'B. 186,5 €', 'C. 205,2 €', 'D. 333,3 €'],
    resposta_correcta: 'A',
    explicacio: 'Cost = 17,6 kWh × 0,1894 €/kWh × 52 setmanes ≈ 173,3 €.',
  },

  // ── SOCIAL ─────────────────────────────────────────────────────────────────

  {
    node_id: 'social-historia-s19',
    pregunta_text: 'Quines eren les classes privilegiades de l\'Antic Règim?',
    opcions: [
      'A. Burgesia i pagesia',
      'B. Artesans i mercaders',
      'C. Noblesa i clergat',
      'D. Proletariat i burgesia',
    ],
    resposta_correcta: 'C',
    explicacio: 'A l\'Antic Règim, la noblesa i el clergat eren les classes privilegiades. La resta (burgesia, pagesia, artesans) eren el Tercer Estat.',
  },
  {
    node_id: 'social-historia-s19',
    pregunta_text: 'Quina de les opcions NO va ser una aplicació de la màquina de vapor durant la Revolució Industrial?',
    opcions: ['A. Indústria tèxtil', 'B. Transport ferroviari', 'C. Mineria', 'D. Aviació'],
    resposta_correcta: 'D',
    explicacio: 'La màquina de vapor va impulsar la indústria tèxtil, el tren i la mineria. L\'aviació és posterior (s.XX, motor de combustió interna).',
  },
  {
    node_id: 'social-conflictes-s20',
    pregunta_text: 'Quin dels fets va tenir lloc en PRIMER lloc cronològicament durant el període de la Segona Guerra Mundial?',
    opcions: [
      'A. Desembarcament de Normandia',
      'B. Annexió d\'Àustria per part d\'Alemanya',
      'C. Llançament de les bombes atòmiques sobre el Japó',
      'D. Invasió alemanya de Polònia',
    ],
    resposta_correcta: 'B',
    explicacio: 'L\'annexió d\'Àustria (Anschluss) va ser el 1938, la invasió de Polònia el 1939, el Desembarcament de Normandia el 1944 i les bombes atòmiques el 1945.',
  },
  {
    node_id: 'social-conflictes-s20',
    pregunta_text: 'Qui va ser el primer cap del govern espanyol durant la Transició democràtica?',
    opcions: ['A. Joan Carles I', 'B. Santiago Carrillo', 'C. Adolfo Suárez', 'D. Felipe González'],
    resposta_correcta: 'C',
    explicacio: 'Adolfo Suárez va ser nomenat president del Govern el 1976 per Joan Carles I i va liderar la transició fins a les primeres eleccions democràtiques.',
  },
  {
    node_id: 'social-mon-actual',
    pregunta_text: 'Quina de les afirmacions sobre el Parlament Europeu és FALSA?',
    opcions: [
      'A. Representa els ciutadans dels estats membres',
      'B. Els seus membres s\'escullen per sufragi universal directe',
      'C. Té el poder executiu de la Unió Europea',
      'D. Comparteix el poder legislatiu amb el Consell de la UE',
    ],
    resposta_correcta: 'C',
    explicacio: 'El poder executiu recau en la Comissió Europea. El Parlament Europeu té funció legislativa i de control, no executiva.',
  },
  {
    node_id: 'social-mon-actual',
    pregunta_text: 'Quina de les següents activitats NO és una pràctica de desenvolupament sostenible?',
    opcions: [
      'A. Reciclar els residus domèstics',
      'B. Comprar roba de segona mà',
      'C. Disminuir el consum d\'energia',
      'D. Viatjar freqüentment en avió per oci',
    ],
    resposta_correcta: 'D',
    explicacio: 'Viatjar en avió genera una gran empremta de carboni i no és sostenible. Les altres tres pràctiques redueixen el consum i els residus.',
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const pool = await mysql.createPool({
    host:     process.env.DB_HOST || 'localhost',
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     parseInt(process.env.DB_PORT || '3306'),
  });

  console.log('Connectat a MySQL');

  // 1. Afegir columna font_oficial si no existeix
  for (const sql of [
    'ALTER TABLE preguntes_bank ADD COLUMN font_oficial BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE preguntes_bank ADD INDEX idx_bank_oficial (node_id, font_oficial)',
  ]) {
    try {
      await pool.query(sql);
      console.log(`✓ ${sql.split(' ').slice(0, 6).join(' ')}...`);
    } catch (e) {
      if (e.errno === 1060 || e.errno === 1061) {
        console.log(`  (ja existeix, omès)`);
      } else {
        throw e;
      }
    }
  }

  // 2. Inserir preguntes oficials (evitar duplicats per pregunta_text)
  let insertades = 0;
  let ignorades  = 0;

  for (const q of PREGUNTES_OFICIALS) {
    const [existing] = await pool.query(
      'SELECT id FROM preguntes_bank WHERE node_id = ? AND pregunta_text = ?',
      [q.node_id, q.pregunta_text]
    );

    if (existing.length > 0) {
      // Marcar com a oficial si ja existeix però no estava marcada
      await pool.query(
        'UPDATE preguntes_bank SET font_oficial = TRUE WHERE id = ?',
        [existing[0].id]
      );
      console.log(`  [actualitzada] ${q.node_id}: ${q.pregunta_text.slice(0, 50)}...`);
      ignorades++;
    } else {
      await pool.query(
        `INSERT INTO preguntes_bank (node_id, pregunta_text, opcions, resposta_correcta, explicacio, font_oficial)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [q.node_id, q.pregunta_text, JSON.stringify(q.opcions), q.resposta_correcta, q.explicacio]
      );
      console.log(`  [inserida]    ${q.node_id}: ${q.pregunta_text.slice(0, 50)}...`);
      insertades++;
    }
  }

  await pool.end();
  console.log(`\n✓ Fet: ${insertades} inserides, ${ignorades} ja existien (marcades com oficials).`);
  console.log(`  Total preguntes oficials: ${PREGUNTES_OFICIALS.length}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
