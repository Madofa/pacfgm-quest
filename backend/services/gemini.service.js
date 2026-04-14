// Gemini API via REST directa — no depèn del SDK ni de la versió instal·lada
// Usa fetch natiu de Node 18+

const MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Tipus de pregunta per afegir varietat — es tria aleatòriament
const TIPUS_PREGUNTA = [
  'conceptual: pregunta sobre la definició o el concepte teòric',
  'aplicació pràctica: pregunta basada en una situació real o quotidiana',
  'càlcul o resolució: l\'alumne ha de fer un pas de càlcul i triar el resultat',
  'identificació d\'errors: una afirmació pot ser certa o falsa, l\'alumne ha d\'identificar l\'error',
  'comparació: l\'alumne ha de distingir entre dos conceptes similars o triar el més adequat',
];

function tipusAleatori(pregsAnteriors) {
  // Evitar repetir el tipus de les últimes preguntes si és possible
  const idx = Math.floor(Math.random() * TIPUS_PREGUNTA.length);
  return TIPUS_PREGUNTA[idx];
}

async function generarPregunta(nodeId, temari, idioma = 'catala', pregsAnteriors = []) {
  const tipus = tipusAleatori(pregsAnteriors);

  const evitarBlock = pregsAnteriors.length > 0
    ? `\nIMPORTANT: Aquestes preguntes ja s'han fet — NO les repeteixis ni facis variacions similars:\n${pregsAnteriors.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
    : '';

  // Per a castellà, el prompt sencer és en castellà per evitar que Gemini ignori la instrucció d'idioma
  let prompt;
  if (idioma === 'castella') {
    prompt = `Eres un profesor experto que prepara estudiantes para las pruebas de acceso a los ciclos formativos de grado medio de Cataluña (PACFGM).

Materia/Nodo: ${nodeId}
Contenido oficial: ${temari}
Nivel: ESO básico (PACFGM)
IDIOMA OBLIGATORIO: castellano. Toda la respuesta debe estar en castellano: pregunta, opciones y explicación. NUNCA en catalán.
${evitarBlock}
Tipo de pregunta a generar: ${tipus}

Genera UNA sola pregunta de tipo test con 4 opciones. La pregunta debe ser clara, breve y adecuada al nivel. Las opciones deben tener una sola respuesta claramente correcta. La explicación debe ser breve y didáctica (máximo 2 líneas).

IMPORTANTE: Usa siempre texto plano sin LaTeX, sin Markdown, sin backticks y sin símbolos como \\cdot, ^2, \\frac, etc. Para matemáticas usa caracteres Unicode directos: × · ÷ √ ² ³ ¼ ½ ¾ y paréntesis normales. NUNCA escribas comillas simples ni backticks alrededor de expresiones.

Responde en formato JSON:
{
  "pregunta": "texto de la pregunta",
  "opcions": ["A. primera opción", "B. segunda opción", "C. tercera opción", "D. cuarta opción"],
  "correcta": "A",
  "explicacio": "explicación breve de por qué A es correcta",
  "necessita_desenvolupament": false
}

El campo "necessita_desenvolupament" debe ser true SOLO si la pregunta requiere hacer cálculos en papel para llegar a la respuesta. Para preguntas conceptuales, de definición, comprensión o gramática, debe ser false.`;
  } else {
    const idiomaText = idioma === 'angles'
      ? 'La pregunta i les opcions han de ser en anglès (és l\'assignatura d\'anglès). PERÒ l\'explicació ("explicacio") ha d\'estar SEMPRE en català, per ajudar l\'alumne a entendre l\'error en la seva llengua.'
      : 'en català. IMPORTANT: tota la resposta ha d\'estar en català, inclosa l\'explicació. MAI en castellà, ni encara que el contingut tracti sobre gramàtica catalana o castellana.';

    prompt = `Ets un professor expert que prepara estudiants per a les proves d'accés als cicles formatius de grau mitjà de Catalunya (PACFGM).

Matèria/Node: ${nodeId}
Contingut oficial: ${temari}
Nivell: ESO bàsic (PACFGM)
Idioma de resposta: ${idiomaText}
${evitarBlock}
Tipus de pregunta que has de generar: ${tipus}

Genera UNA sola pregunta de tipus test amb 4 opcions. La pregunta ha de ser clara, breu i adequada al nivell. Les opcions han de tenir una sola resposta clarament correcta. L'explicació ha de ser breu i didàctica (màxim 2 línies).

IMPORTANT: Usa SEMPRE text pla sense LaTeX, sense Markdown, sense backticks i sense símbols com \\cdot, ^2, \\frac, etc. Per a matemàtiques usa caràcters Unicode directes: × · ÷ √ ² ³ ¼ ½ ¾ i parèntesis normals. Exemple correcte: "20 - 5 · (6 - 2)²". MAI escriguis cometes simples ni backticks al voltant d'expressions.

Respon en format JSON:
{
  "pregunta": "text de la pregunta",
  "opcions": ["A. primera opció", "B. segona opció", "C. tercera opció", "D. quarta opció"],
  "correcta": "A",
  "explicacio": "explicació breu de per qué A és correcta",
  "necessita_desenvolupament": false
}

El camp "necessita_desenvolupament" ha de ser true NOMÉS si la pregunta requereix fer càlculs sobre paper per arribar a la resposta (tipus càlcul o resolució). Per a preguntes conceptuals, de definició, de comprensió o de gramàtica, ha de ser false.`;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const json = await response.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter(p => p.text && !p.thought)
    .map(p => p.text)
    .join('').trim();
  if (!text) throw new Error(`Resposta buida. finishReason: ${json.candidates?.[0]?.finishReason}`);

  const jsonStr = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No s\'ha trobat cap JSON vàlid a la resposta de Gemini');
    data = JSON.parse(match[0]);
  }

  if (!data.pregunta || !Array.isArray(data.opcions) || data.opcions.length !== 4
      || !data.correcta || !data.explicacio) {
    throw new Error('Estructura JSON invàlida de Gemini');
  }

  return { ...data, necessita_desenvolupament: !!data.necessita_desenvolupament };
}

// ── INFORME DE PROGRÉS (per a tutor/pare) ────────────────────────────────────

const MATERIA_NOMS = {
  mates:      'Matemàtiques',
  catala:     'Català',
  castella:   'Castellà',
  angles:     'Anglès',
  ciencies:   'Ciències',
  tecnologia: 'Tecnologia',
  social:     'Social',
};

async function generarInforme({ alumne, progresMat, retencio, numSessions30d }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

  // Construïm el resum de dades per a Gemini
  const resumDades = progresMat.map(m => {
    const nomMat = MATERIA_NOMS[m.materia] || m.materia;
    const ret = retencio[m.materia];
    const retPct = ret ? `${ret.pct}% retenció (${ret.fresques}/${ret.total} preg. fresques)` : 'sense dades SR';
    return `- ${nomMat}: ${m.completats}/${m.total_nodes} temes completats (${m.dominats} dominats), puntuació mitja ${Math.round(m.puntuacio_mitja || 0)}%, ${retPct}`;
  }).join('\n');

  const prompt = `Ets un assessor pedagògic que ajuda pares i professors a entendre el progrés d'un estudiant que es prepara per a la PACFGM (Prova d'Accés als Cicles Formatius de Grau Mitjà de Catalunya).

Dades de l'alumne:
- Nom: ${alumne.alias}
- Rang: ${alumne.rang} (Nivell ${alumne.nivell})
- XP total: ${alumne.xp_total}
- Ratxa actual: ${alumne.racha_dies} dies
- Sessions últims 30 dies: ${numSessions30d}
- Última sessió: ${alumne.ultima_sessio || 'mai'}

Progrés per matèria:
${resumDades}

Genera un informe en format JSON amb exactament aquesta estructura:
{
  "valoracio_general": "Valoració breu de 2-3 línies del progrés global, en to positiu i motivador",
  "fortaleses": ["àrea o comportament on l'alumne destaca", "..."],
  "en_progres": ["àrea que s'està treballant activament amb avanços", "..."],
  "febles": ["àrea amb mancances o poc repàs, amb consell concret", "..."],
  "no_explorat": ["matèria o àrea no treballada encara", "..."],
  "recomanacio": "Recomanació concreta i accionable per a la pròxima setmana (1-2 frases)"
}

Les llistes poden tenir de 0 a 4 elements. Si una categoria no té res rellevant, posa un array buit. Escriu en català, to proper i constructiu.`;

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const json = await response.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  const text = parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
  if (!text) throw new Error('Resposta buida de Gemini');

  const jsonStr = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('JSON invàlid a la resposta de Gemini');
  }
}

// ── ANÀLISI D'IMATGE (Gemini Vision) ─────────────────────────────────────────

async function analitzarDesenvolupament({ base64, mimeType, preguntaText, respostaCorrecta, nodeId }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

  const materia = nodeId ? nodeId.split('-')[0] : 'mates';
  const nomMateria = MATERIA_NOMS[materia] || 'Matemàtiques';

  const prompt = `Ets un professor de ${nomMateria} que revisa el treball manual d'un alumne que es prepara per a la PACFGM (Prova d'Accés als Cicles Formatius de Grau Mitjà de Catalunya).

PREGUNTA DE L'EXAMEN: ${preguntaText}
RESPOSTA CORRECTA: ${respostaCorrecta}
Node/tema: ${nodeId}

A la imatge pots veure el treball manual que ha fet l'alumne.

IMPORTANT — PRIMER comprova si el treball de la imatge resol aquesta pregunta concreta:
- Si la imatge mostra càlculs o un plantejament DIFERENT a la pregunta, posa "correcte_procediment": false i indica-ho clarament als errors_detectats ("El treball no correspon a la pregunta plantejada").
- Si la imatge és il·legible, en blanc o no mostra cap treball relacionat, posa tots els camps false i explica-ho.
- Només si el treball SÍ resol aquesta pregunta, avalua si el procediment i el resultat són correctes.

Respon en format JSON:
{
  "correcte_resultat": true/false,
  "correcte_procediment": true/false,
  "errors_detectats": ["descripció de l'error o raó per la qual no correspon a la pregunta", "..."],
  "punts_positius": ["cosa que ha fet bé, si escau", "..."],
  "consell": "consell concret i accionable (1-2 frases, en català)"
}`;

  // gemini-2.5-flash per a visió: suporta multimodal, filtrem thinking tokens amb !p.thought
  const VISION_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

  const response = await fetch(`${VISION_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: prompt },
        ],
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini Vision API error ${response.status}: ${err}`);
  }

  const json = await response.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  const text = parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
  if (!text) {
    console.error('[analitzar-imatge] Resposta buida. finishReason:', json.candidates?.[0]?.finishReason, 'parts:', JSON.stringify(parts).slice(0, 300));
    throw new Error('Resposta buida de Gemini Vision');
  }

  // Extreure JSON robust: eliminar markdown, agafar el primer bloc {...}
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* continua */ }
    }
    console.error('[analitzar-imatge] JSON invàlid. Raw text:', text.slice(0, 500));
    throw new Error('JSON invàlid a la resposta de Gemini Vision');
  }
}

module.exports = { generarPregunta, generarInforme, analitzarDesenvolupament };
