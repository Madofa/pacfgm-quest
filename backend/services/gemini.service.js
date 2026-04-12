const { GoogleGenerativeAI } = require('@google/generative-ai');

let model;

function getModel() {
  if (!model) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }
  return model;
}

async function generarPregunta(nodeId, temari, idioma = 'catala') {
  const idiomaText = idioma === 'castella' ? 'en castellano' : 'en català';

  const prompt = `Ets un professor expert que prepara estudiants per a les proves d'accés als cicles formatius de grau mitjà de Catalunya (PACFGM).

Matèria/Node: ${nodeId}
Contingut oficial: ${temari}
Nivell: ESO bàsic (PACFGM)
Idioma de resposta: ${idiomaText}

Genera UNA sola pregunta de tipus test amb 4 opcions. La pregunta ha de ser clara, breu i adequada al nivell. Les opcions han de tenir una sola resposta clarament correcta. L'explicació ha de ser breu i didàctica (màxim 2 línies).

Respon ÚNICAMENT en format JSON vàlid, sense cap text fora del JSON:
{
  "pregunta": "text de la pregunta",
  "opcions": ["A. primera opció", "B. segona opció", "C. tercera opció", "D. quarta opció"],
  "correcta": "A",
  "explicacio": "explicació breu de per qué A és correcta"
}`;

  const m = getModel();
  const result = await m.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip possible markdown code fences from Gemini response
  const jsonStr = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const data = JSON.parse(jsonStr);

  if (!data.pregunta || !Array.isArray(data.opcions) || data.opcions.length !== 4
      || !data.correcta || !data.explicacio) {
    throw new Error('Estructura JSON invàlida de Gemini');
  }

  return data;
}

module.exports = { generarPregunta };
