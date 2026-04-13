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
  const idiomaText = idioma === 'castella' ? 'en castellano' : 'en català';
  const tipus = tipusAleatori(pregsAnteriors);

  const evitarBlock = pregsAnteriors.length > 0
    ? `\nIMPORTANT: Aquestes preguntes ja s'han fet — NO les repeteixis ni facis variacions similars:\n${pregsAnteriors.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
    : '';

  const prompt = `Ets un professor expert que prepara estudiants per a les proves d'accés als cicles formatius de grau mitjà de Catalunya (PACFGM).

Matèria/Node: ${nodeId}
Contingut oficial: ${temari}
Nivell: ESO bàsic (PACFGM)
Idioma de resposta: ${idiomaText}
${evitarBlock}
Tipus de pregunta que has de generar: ${tipus}

Genera UNA sola pregunta de tipus test amb 4 opcions. La pregunta ha de ser clara, breu i adequada al nivell. Les opcions han de tenir una sola resposta clarament correcta. L'explicació ha de ser breu i didàctica (màxim 2 línies).

Respon en format JSON:
{
  "pregunta": "text de la pregunta",
  "opcions": ["A. primera opció", "B. segona opció", "C. tercera opció", "D. quarta opció"],
  "correcta": "A",
  "explicacio": "explicació breu de per qué A és correcta"
}`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
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

  return data;
}

module.exports = { generarPregunta };
