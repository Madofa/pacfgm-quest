#!/usr/bin/env node
// Tradueix les explicacions de les preguntes d'anglès al català
// Execució: node scripts/traduir-explicacions-angles.js

require('dotenv').config({ override: true });
const pool = require('../db/connection');

const MODEL   = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

async function traduirAlCatala(text) {
  const prompt = `Tradueix al català aquesta explicació pedagògica d'una pregunta d'anglès per a un alumne de secundària. Mantén el contingut exacte i el to didàctic. Retorna ÚNICAMENT el text traduït, sense cometes ni cap altra cosa.\n\nText: ${text}`;

  const res = await fetch(`${API_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  const translated = parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
  if (!translated) throw new Error('Resposta buida');
  return translated;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const [rows] = await pool.query(
    `SELECT id, explicacio FROM preguntes_bank WHERE node_id LIKE 'angles-%' AND explicacio IS NOT NULL AND explicacio != ''`
  );
  console.log(`Total preguntes d'anglès: ${rows.length}`);

  let ok = 0, errors = 0;
  for (const row of rows) {
    try {
      const traduit = await traduirAlCatala(row.explicacio);
      await pool.query('UPDATE preguntes_bank SET explicacio = ? WHERE id = ?', [traduit, row.id]);
      ok++;
      if (ok % 10 === 0) console.log(`  ${ok}/${rows.length} traduïdes...`);
      await sleep(300); // evitar rate limit Gemini
    } catch (err) {
      errors++;
      console.error(`  ERROR id=${row.id}: ${err.message}`);
    }
  }

  console.log(`\nFet: ${ok} traduïdes, ${errors} errors.`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
