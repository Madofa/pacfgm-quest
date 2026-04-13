/**
 * seed-preguntes.js
 * Pobla preguntes_bank amb preguntes basades en exàmens reals PACFGM
 * (Generalitat de Catalunya, Departament d'Educació)
 *
 * Ús: node scripts/seed-preguntes.js [node_id]
 * Sense arguments: processa tots els nodes
 * Amb node_id: processa només aquell node
 *
 * Exemples:
 *   node scripts/seed-preguntes.js
 *   node scripts/seed-preguntes.js tecnologia-electricitat
 */

require('dotenv').config({ override: true });
const mysql = require('mysql2/promise');
const { NODES } = require('../data/skillTree');

const MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const QUESTIONS_PER_NODE = 30; // Preguntes a generar per node
const MIN_EXISTING = 25;       // No regenera si ja en té prou

// ── Contextos reals d'exàmens PACFGM 2024 per matèria ────────────────────────

const EXAM_CONTEXT = {
  mates: `
CONTEXT D'EXAMEN REAL PACFGM 2024 — Competència matemàtica:
Els exàmens de matemàtiques del PACFGM són problemes oberts però hem de convertir-los a test A/B/C/D.
Exemples de contingut real (amb solucions):
- Perímetre roda gran (radi 60cm): 2·π·60 = 376,99 cm. Roda petita (radi 25cm): 157,08 cm.
- Operacions enters: (-3)+(+5)-(-7)+(-12)=-3. (+5)·(-4)+(+7)·(-3)=1. (+9)-(-21):(+3)=16.
- Conversió unitats: 5L + 1,5L + 2·0,75L + 0,6L = 8,6L d'aigua total.
- Escala 1:200: 8cm→16m, 3cm→6m, 4cm→8m, 2cm→4m. Superfície: 16·6+8·4=128 m².
- Equació 2x-5x+7=-2: substituint x=3: 6-15+7=-2. Sí que és solució.
- Estadística: enquesta 700 persones. Satisfactòria 35%→245 persones. Poc satisfactòria 38%→266 persones.
Nivell: ESO bàsic. Genera preguntes numèriques concretes amb opcions plausibles però una sola correcta.`,

  catala: `
CONTEXT D'EXAMEN REAL PACFGM 2024 — Competència en llengua catalana:
L'examen inclou comprensió lectora (text sobre vaixells oceanogràfics) i gramàtica.
Contingut real (solucionari):
- Sinònim de "salpar": sortir, partir, llevar àncores.
- Categories gramaticals: "també" → adverbi; "aquest" → determinant demostratiu; "sec" → adjectiu; "campanyes" → substantiu; "a" → preposició.
- El Challenger va catalogar més de 4.000 espècies marines desconegudes.
- L'Institut de Ciències del Mar de Barcelona va canviar el nom de l'Institut d'Investigacions Pesqueres.
- Connectius adversatius, subordinades relatives, concordança, derivació, etc.
Genera preguntes de gramàtica catalana (categories gramaticals, sinònims, oracions, ortografia, morfologia) en format A/B/C/D.`,

  castella: `
CONTEXT D'EXAMEN REAL PACFGM 2024 — Competencia en lengua castellana:
El examen incluye comprensión lectora (texto sobre el chicle/sicté maya) y gramática.
Contenido real (soluciones):
- El sicté era el chicle que usaban los mayas, envuelto en hojas de maíz para ceremonias religiosas.
- Adams comercializó el chicle industrial a finales del siglo XIX con el nombre de Chiclets.
- Categorías gramaticales: verbos, sustantivos, adjetivos, adverbios, preposiciones.
- Sinónimos, antónimos, campos semánticos, prefijos y sufijos.
Genera preguntas de gramática castellana (categorías gramaticales, sinónimos, ortografía, morfología, sintaxis básica) en formato A/B/C/D.`,

  angles: `
CONTEXT D'EXAMEN REAL PACFGM 2024 — Competència en llengua estrangera: anglès:
L'examen té preguntes de selecció múltiple A/B/C/D. Exemples reals:
Gap-fill text sobre Maria que viu a Jordania:
1. "Clara told me she saw you __(1)__ a party" → b) told
2. "you spent lots of time __(3)__ up with each other" → d) talking
3. "I haven't seen you __(4)__ high school" → a) since
4. "The company __(5)__ I work for" → c) who
5. "I said it was fine __(6)__ I could take my family" → c) if
6. "We can't speak Arabic __(7)__" → b) still
7. "I've discovered I'm a __(8)__ cook" → d) better
8. "You __(9)__ come and visit" → d) must
Dialogue responses:
1. "Excuse me, can I talk to you?" → a) I'm sorry, I'm busy right now.
4. "What is your hobby?" → a) I'm keen on travelling.
Genera preguntes de gramàtica anglesa i comprensió lectora en format A/B/C/D (4 opcions).`,

  ciencies: `
CONTEXT D'EXAMEN REAL PACFGM 2024 — Competència d'interacció amb el món físic (ciències):
Contingut real (solucionari):
- Força resultant: suma de totes les forces que actuen sobre un cos.
- Forces sobre un jugador en repòs: Normal (amunt), Pes (avall), Tensió resultant (horitzontal).
- Velocitat 10 km/h = 2,78 m/s (conversió: ·1000/3600).
- Moviment rectilini uniforme (MRU): x = v·t.
- Reacció de neutralització: àcid cítric (C₆H₈O₇) + NaHCO₃ → NaC₆H₇O₇ + H₂O + CO₂.
- Massa molecular àcid cítric: (6·12)+(8·1)+(7·16)=192 g/mol.
- Bicarbonat sodi NaHCO₃: (23)+(1)+(12)+(3·16)=84 g/mol.
- Densitat: d=m/V. Fruites que suren: densitat < 1 g/cm³ (plàtan, mandarina, poma, meló). Raïm: 1,2 g/cm³ (no sura).
Genera preguntes de física i química en format A/B/C/D.`,

  tecnologia: `
CONTEXT D'EXAMEN REAL PACFGM 2024 — Competència en tecnologies:
PREGUNTES REALS JA EN FORMAT A/B/C/D (amb solucions):
Q2: Cota C si A=15cm i B=doble de A: a)15cm b)30cm c)45cm **d)60cm** (C=2A+B=2·15+30=60)
Q3: Voltatge resistència 1kΩ amb 1μA: a)1nV b)1μV **c)1mV** d)1V (V=R·I=1kΩ·1μA=1mV)
Q4: Esforç de l'objecte (forces de dalt+baix sobre centre): a)Tracció **b)Flexió** c)Compressió d)Torsió
Q5: Mecanisme que converteix moviment circular en rectilini alternatiu: **a)Biela-manovella** b)Engranatge c)Pinyó-cremallera d)Tren de politges
Q8: Portes AND amb A=1,B=1,C=0: a)S1=0,S2=0 b)S1=1,S2=0 **c)S1=0,S2=1** d)S1=1,S2=1
Q9: Arxius que guarden hàbits de navegació: a)Historial b)Tallafocs **c)Galetes** d)Contrasenyes
Q10: Cost anual bateria 17,6kWh a 18,94c€/kWh (52 setmanes): **a)173,3€** b)186,5€ c)205,2€ d)333,3€
Eines: Serjant→Subjectar, Tornavis→Cargolar, Trepant→Foradar, Llima→Polir.
Magnituds: Pes p=m·g, Força F=m·a, Treball W=F·d, Potència P=W/t.
Genera preguntes de tecnologia industrial en format A/B/C/D.`,

  social: `
CONTEXT D'EXAMEN REAL PACFGM 2024 — Competència social i ciutadana:
Contingut real (solucionari):
- Oceans: Atlàntic(1), Antàrtic(2), Índic(3), Pacífic(4) al planisferi.
- CCAA Espanya: Astúries(1), Extremadura(2), Múrcia(3), Aragó(4).
- Desenvolupament sostenible: Reciclar(A), Comprar roba 2a mà(A), Disminuir consum(A), Viatjar avió(B-no sostenible).
- Antic Règim: Classes privilegiades → Clergat(A), Noblesa(A). No privilegiades → Burgesia(B), Pagesia(B).
- Màquina de vapor R.Industrial: Agricultura(A), Indústria tèxtil(A), Locomotora(A), Avió(B-no aplicació).
- Dictadura: Repressió(V), Censura(V), No eleccions periòdiques(F→eleccions=False), Poder concentrat(V).
- IIGM cronologia: Alemanya annexiona Àustria(1), Invasió Polònia(2), Desembarcament Normandia(3), Bombes atòmiques Japó(4).
- Franquisme: Joan Carles I→Rei Transició, Adolfo Suárez→President Govern Transició, Josep Tarradellas→President Generalitat exili, Franco→Dictador.
- UE: CEE és l'antecedent(V), euro el 2002(V), membres importants(F-UK ja no és membre), Parlament→poder legislatiu no executiu(F).
- Saldo migratori positiu 2013-2019(V), 2021 max emigració(V), max immigracio 2019 no 2018(F).
Genera preguntes de ciències socials, geografia i història en format A/B/C/D.`,
};

// ── Gemini API ────────────────────────────────────────────────────────────────

async function generarPreguntes(nodeId, temari, examContext, n) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

  const prompt = `Ets un professor expert que prepara estudiants per a les proves d'accés als cicles formatius de grau mitjà de Catalunya (PACFGM), convocatòria del Departament d'Educació de la Generalitat de Catalunya.

${examContext}

Node específic a treballar: ${nodeId}
Contingut curricular oficial d'aquest node:
${temari}

Genera exactament ${n} preguntes de tipus test A/B/C/D per a aquest node específic.
Cada pregunta ha de:
- Ser adequada al nivell ESO bàsic / PACFGM
- Tenir UNA SOLA resposta correcta entre les 4 opcions
- Les opcions incorrectes han de ser plausibles però clarament incorrectes si saps el tema
- L'explicació ha de ser breu i didàctica (1-2 línies màxim)
- Estar en català (excepte per al node angles-* que ha de ser en anglès)

IMPORTANT — Varietat de tipus de pregunta. Distribueix les ${n} preguntes entre aquests tipus:
- Conceptual: definició o concepte teòric
- Aplicació pràctica: situació real o quotidiana
- Càlcul o resolució: l'alumne fa un pas de càlcul i tria el resultat
- Identificació d'errors: afirmació que pot ser certa o falsa
- Comparació: distingir entre dos conceptes similars

Respon ÚNICAMENT amb un array JSON vàlid, sense cap text fora del JSON:
[
  {
    "pregunta": "text de la pregunta",
    "opcions": ["A. primera opció", "B. segona opció", "C. tercera opció", "D. quarta opció"],
    "correcta": "A",
    "explicacio": "explicació breu"
  }
]`;

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 8192, responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error ${response.status}: ${err}`);
  }

  const json = await response.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter(p => p.text && !p.thought)
    .map(p => p.text)
    .join('').trim();

  if (!text) throw new Error(`Resposta buida: ${json.candidates?.[0]?.finishReason}`);

  const jsonStr = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
  const data = JSON.parse(jsonStr);

  if (!Array.isArray(data)) throw new Error('La resposta no és un array');

  return data.filter(q =>
    q.pregunta && Array.isArray(q.opcions) && q.opcions.length === 4 &&
    q.correcta && ['A','B','C','D'].includes(q.correcta.toUpperCase()) && q.explicacio
  ).map(q => ({ ...q, correcta: q.correcta.toUpperCase() }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function ensureTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS preguntes_bank (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      node_id           VARCHAR(100) NOT NULL,
      pregunta_text     TEXT NOT NULL,
      opcions           JSON NOT NULL,
      resposta_correcta CHAR(1) NOT NULL,
      explicacio        TEXT,
      creat_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_bank_node (node_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sr_pregunta (
      id                     INT AUTO_INCREMENT PRIMARY KEY,
      usuari_id              INT NOT NULL,
      pregunta_id            INT NOT NULL,
      propera_revisio        DATE NOT NULL,
      interval_dies          INT DEFAULT 1,
      num_revisions          INT DEFAULT 0,
      consecutives_correctes INT DEFAULT 0,
      UNIQUE KEY uq_usuari_pregunta (usuari_id, pregunta_id),
      FOREIGN KEY (usuari_id)   REFERENCES usuaris(id) ON DELETE CASCADE,
      FOREIGN KEY (pregunta_id) REFERENCES preguntes_bank(id) ON DELETE CASCADE
    )
  `);
  // Columnes addicionals a preguntes_log
  for (const col of [
    'ALTER TABLE preguntes_log ADD COLUMN pregunta_bank_id INT NULL',
    'ALTER TABLE preguntes_log ADD COLUMN explicacio TEXT NULL',
  ]) {
    try { await pool.query(col); } catch (e) { if (e.errno !== 1060) throw e; }
  }
  console.log('✓ Taules verificades/creades');
}

async function main() {
  const targetNode = process.argv[2];

  const pool = await mysql.createPool({
    host:     process.env.DB_HOST || 'localhost',
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     parseInt(process.env.DB_PORT || '3306'),
  });

  await ensureTables(pool);

  const nodes = targetNode
    ? (NODES[targetNode] ? [NODES[targetNode]] : [])
    : Object.values(NODES);

  if (!nodes.length) {
    console.error(`Node no trobat: ${targetNode}`);
    await pool.end();
    return;
  }

  console.log(`\n=== SEED PREGUNTES PACFGM ===`);
  console.log(`Nodes a processar: ${nodes.length}`);
  console.log(`Preguntes per node: ${QUESTIONS_PER_NODE}\n`);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const node of nodes) {
    const nodeId = node.id;

    // Comprovar quantes preguntes ja té
    const [existing] = await pool.query(
      'SELECT COUNT(*) AS n FROM preguntes_bank WHERE node_id = ?',
      [nodeId]
    );
    const count = existing[0].n;

    if (count >= MIN_EXISTING && !targetNode) {
      console.log(`⏭  ${nodeId} (ja té ${count} preguntes, saltant)`);
      totalSkipped++;
      continue;
    }

    // Determinar context de l'examen segons matèria
    const materia = node.materia;
    const examContext = EXAM_CONTEXT[materia] || '';

    console.log(`⚙  ${nodeId} (${count} existents)...`);

    try {
      const preguntes = await generarPreguntes(nodeId, node.temari, examContext, QUESTIONS_PER_NODE);
      console.log(`   → Gemini ha generat ${preguntes.length} preguntes vàlides`);

      let inserted = 0;
      for (const q of preguntes) {
        try {
          await pool.query(
            `INSERT INTO preguntes_bank (node_id, pregunta_text, opcions, resposta_correcta, explicacio)
             VALUES (?, ?, ?, ?, ?)`,
            [nodeId, q.pregunta, JSON.stringify(q.opcions), q.correcta, q.explicacio]
          );
          inserted++;
        } catch (err) {
          // Ignorar duplicats
          if (err.code !== 'ER_DUP_ENTRY') console.warn(`   ⚠ Insert error: ${err.message}`);
        }
      }

      console.log(`   ✓ ${inserted} preguntes inserides a preguntes_bank`);
      totalInserted += inserted;

      // Pausa per no saturar l'API
      if (nodes.length > 1) await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.error(`   ✗ Error en ${nodeId}: ${err.message}`);
    }
  }

  console.log(`\n=== RESULTAT ===`);
  console.log(`Inserides: ${totalInserted} preguntes`);
  console.log(`Saltats:   ${totalSkipped} nodes (ja tenien prou preguntes)`);

  await pool.end();
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
