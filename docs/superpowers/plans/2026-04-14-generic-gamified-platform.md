# Generic Gamified Study Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve PACFGM Quest into a generic gamified study platform where students upload their own content (PDFs, images, URLs), an ingestion pipeline normalizes it to text, a worker generates structured questions stored in MySQL, and the existing RPG + spaced repetition layers work with this dynamic content pool.

**Architecture:** New ingestion service uses `pdf-parse` for native PDFs and Gemini 2.5 Flash Vision for scanned PDFs/images; URL content extracted with `@mozilla/readability`. Normalized text is chunked (~750 tokens) and stored in MySQL with detected topics. A `setImmediate` background worker generates JSON-schema-validated questions per chunk. The spaced repetition system (SM-2 variant, SR_Q_INTERVALS=[1,3,7,14,30]) works against the stored `generated_questions` pool with stable IDs. The RPG layer maps detected topics to `user_study_nodes` instead of the hardcoded PACFGM `skillTree.js`.

**Tech Stack:** Node.js/Express + MySQL (existing), React/Vite (existing), Gemini 2.5 Flash API (existing), `pdf-parse`, `@mozilla/readability` + `jsdom`

---

## File Structure

### New files

```
backend/services/ingestion.service.js       — PDF/image/URL → text + topics
backend/services/questionGenerator.service.js — Gemini structured output question gen
backend/controllers/source.controller.js    — Upload/list/delete sources
backend/controllers/questionGen.controller.js — Trigger generation, stats
backend/routes/source.routes.js
backend/routes/questionGen.routes.js
backend/scripts/test-ingestion.js           — CLI dev tool (cost validation)
backend/db/migrations/002_study_content.sql — study_sources, source_chunks, study_topics
backend/db/migrations/003_generated_questions.sql — generated_questions, sr_generated
backend/db/migrations/004_dynamic_nodes.sql — user_study_nodes
backend/tests/ingestion.service.test.js
backend/tests/questionGenerator.service.test.js
frontend/src/pages/MyContent.jsx
frontend/src/components/Sources/UploadZone.jsx
frontend/src/components/Sources/SourceList.jsx
```

### Modified files

```
backend/services/gemini.service.js          — Add extractTextFromPDF()
backend/controllers/pregunta.controller.js  — Add generarSessioFromSource(), respondreGeneratedQuestion()
backend/controllers/progres.controller.js   — Add getUserStudyNodes()
backend/routes/pregunta.routes.js           — Register new endpoints
backend/routes/progres.routes.js            — Register /my-nodes
backend/app.js                              — Register source + questionGen routes
frontend/src/App.jsx                        — Add /my-content route
```

---

## Phase A — Ingestion Pipeline

### Task A1: Install dependencies

**Files:** `backend/package.json`

- [ ] **Step 1: Install**

```bash
cd /Users/migueldelolmofuente/Antigravity/pacfgm-quest/backend
npm install pdf-parse @mozilla/readability jsdom
```

- [ ] **Step 2: Verify**

```bash
node -e "require('pdf-parse'); require('@mozilla/readability'); require('jsdom'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/migueldelolmofuente/Antigravity/pacfgm-quest
git add backend/package.json backend/package-lock.json
git commit -m "chore: add pdf-parse, readability, jsdom for ingestion"
```

---

### Task A2: Add `extractTextFromPDF` to gemini.service.js

**Files:**
- Modify: `backend/services/gemini.service.js`
- Create: `backend/tests/ingestion.service.test.js`

- [ ] **Step 1: Write failing test**

```javascript
// backend/tests/ingestion.service.test.js
import { jest } from '@jest/globals';

global.fetch = jest.fn();

describe('gemini.service — extractTextFromPDF', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns extracted text and topics from base64 PDF', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify({
              extracted_text: '# Tema 1\nContenido...',
              detected_topics: ['Fracciones', 'Álgebra'],
              language: 'es',
              page_count: 3
            }) }]
          }
        }]
      })
    });

    const { extractTextFromPDF } = await import('../services/gemini.service.js');
    const result = await extractTextFromPDF('base64data', 'application/pdf');

    expect(result.extracted_text).toContain('Tema 1');
    expect(result.detected_topics).toHaveLength(2);
    expect(result.language).toBe('es');
  });

  it('throws on non-ok response', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'Rate limited' });

    const { extractTextFromPDF } = await import('../services/gemini.service.js');
    await expect(extractTextFromPDF('data', 'application/pdf')).rejects.toThrow('Gemini error 429');
  });
});
```

- [ ] **Step 2: Verify it fails**

```bash
cd backend && npx jest tests/ingestion.service.test.js --no-coverage
```

Expected: FAIL — `extractTextFromPDF is not a function`

- [ ] **Step 3: Add function to gemini.service.js**

Open `backend/services/gemini.service.js`. The file exports at the bottom — add before the export block:

```javascript
// --- Ingestion helpers ---

async function extractTextFromPDF(base64, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  const prompt = `Analiza este documento y extrae su contenido completo.

Devuelve JSON con este esquema:
{
  "extracted_text": "texto completo en markdown (# títulos, ## subtítulos, listas con -, LaTeX entre $ $)",
  "detected_topics": ["hasta 10 temas principales como strings descriptivos"],
  "language": "es|ca|en|...",
  "page_count": número
}
Solo devuelve JSON válido.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 65536,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              extracted_text: { type: 'string' },
              detected_topics: { type: 'array', items: { type: 'string' } },
              language: { type: 'string' },
              page_count: { type: 'integer' }
            },
            required: ['extracted_text', 'detected_topics', 'language', 'page_count']
          }
        }
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.filter(p => p.text && !p.thought)
    ?.map(p => p.text)
    ?.join('') ?? '';

  return JSON.parse(text);
}
```

Add `extractTextFromPDF` to the existing export at the bottom.

- [ ] **Step 4: Verify tests pass**

```bash
npx jest tests/ingestion.service.test.js --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/services/gemini.service.js backend/tests/ingestion.service.test.js
git commit -m "feat: add extractTextFromPDF to Gemini service (JSON schema output)"
```

---

### Task A3: Create ingestion.service.js

**Files:**
- Create: `backend/services/ingestion.service.js`
- Modify: `backend/tests/ingestion.service.test.js`

- [ ] **Step 1: Add tests for native PDF and URL**

Append to `backend/tests/ingestion.service.test.js`:

```javascript
describe('ingestion.service — ingestNativePDF', () => {
  it('returns text from a native PDF buffer', async () => {
    const pdfParse = await import('pdf-parse');
    jest.spyOn(pdfParse, 'default').mockResolvedValue({ text: 'Contenido real', numpages: 5 });

    const { ingestNativePDF } = await import('../services/ingestion.service.js');
    const result = await ingestNativePDF(Buffer.from('fake-pdf'));

    expect(result.text).toBe('Contenido real');
    expect(result.page_count).toBe(5);
    expect(result.method).toBe('native');
    expect(result.is_scanned).toBe(false);
  });

  it('flags short text as scanned', async () => {
    const pdfParse = await import('pdf-parse');
    jest.spyOn(pdfParse, 'default').mockResolvedValue({ text: 'abc', numpages: 10 });

    const { ingestNativePDF } = await import('../services/ingestion.service.js');
    const result = await ingestNativePDF(Buffer.from('scan'));
    expect(result.is_scanned).toBe(true);
  });
});

describe('ingestion.service — ingestURL', () => {
  it('extracts article content from HTML', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><body><article><h1>Título</h1><p>Cuerpo del artículo con suficiente texto para pasar el umbral mínimo de caracteres requeridos.</p></article></body></html>',
      headers: { get: () => 'text/html' }
    });

    const { ingestURL } = await import('../services/ingestion.service.js');
    const result = await ingestURL('https://ejemplo.com/articulo');

    expect(result.text).toContain('Título');
    expect(result.method).toBe('url');
  });

  it('throws on HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    const { ingestURL } = await import('../services/ingestion.service.js');
    await expect(ingestURL('https://ejemplo.com/404')).rejects.toThrow('HTTP 404');
  });
});

describe('ingestion.service — chunkText', () => {
  it('splits long text into chunks under targetChars', async () => {
    const { chunkText } = await import('../services/ingestion.service.js');
    const para = 'Párrafo de prueba.\n\n';
    const text = para.repeat(50);
    const chunks = chunkText(text, 200);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(c => expect(c.length).toBeLessThanOrEqual(300));
  });
});
```

- [ ] **Step 2: Verify they fail**

```bash
npx jest tests/ingestion.service.test.js --no-coverage
```

Expected: FAIL — module not found

- [ ] **Step 3: Create the service**

```javascript
// backend/services/ingestion.service.js
import pdfParse from 'pdf-parse';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { extractTextFromPDF } from './gemini.service.js';

const NATIVE_PDF_MIN_CHARS = 200;

async function ingestNativePDF(buffer) {
  const data = await pdfParse(buffer);
  const text = (data.text || '').trim();
  return {
    text,
    page_count: data.numpages,
    method: 'native',
    is_scanned: text.length < NATIVE_PDF_MIN_CHARS
  };
}

async function ingestWithVision(buffer, mimeType) {
  const base64 = buffer.toString('base64');
  const result = await extractTextFromPDF(base64, mimeType);
  return {
    text: result.extracted_text,
    page_count: result.page_count,
    detected_topics: result.detected_topics,
    language: result.language,
    method: 'vision'
  };
}

async function ingestPDF(buffer) {
  const native = await ingestNativePDF(buffer);
  if (!native.is_scanned) return native;
  return ingestWithVision(buffer, 'application/pdf');
}

async function ingestURL(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StudyBot/1.0)' }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article?.textContent || article.textContent.length < 100) {
    throw new Error('No se pudo extraer contenido útil. La página puede requerir JavaScript.');
  }

  return { text: article.textContent.trim(), title: article.title || url, method: 'url' };
}

function chunkText(text, targetChars = 3000) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + para).length > targetChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export { ingestPDF, ingestNativePDF, ingestWithVision, ingestURL, chunkText };
```

- [ ] **Step 4: Verify tests pass**

```bash
npx jest tests/ingestion.service.test.js --no-coverage
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/services/ingestion.service.js backend/tests/ingestion.service.test.js
git commit -m "feat: ingestion service — PDF (native+vision), URL, chunker"
```

---

### Task A4: CLI dev tool for cost validation

**Files:**
- Create: `backend/scripts/test-ingestion.js`

- [ ] **Step 1: Create the script**

```javascript
// backend/scripts/test-ingestion.js
// node scripts/test-ingestion.js --pdf path/to/file.pdf
// node scripts/test-ingestion.js --url https://example.com
// node scripts/test-ingestion.js --image path/to/photo.jpg

import 'dotenv/config';
import { readFile } from 'fs/promises';
import { ingestPDF, ingestURL, ingestWithVision, chunkText } from '../services/ingestion.service.js';

const [flag, target] = process.argv.slice(2);
if (!flag || !target) {
  console.error('Usage: node scripts/test-ingestion.js --pdf|--url|--image <target>');
  process.exit(1);
}

async function run() {
  console.time('ingestion');
  let result;

  if (flag === '--pdf') {
    const buf = await readFile(target);
    console.log(`PDF size: ${(buf.length / 1024).toFixed(1)} KB`);
    result = await ingestPDF(buf);
  } else if (flag === '--url') {
    result = await ingestURL(target);
  } else if (flag === '--image') {
    const buf = await readFile(target);
    const ext = target.split('.').pop().toLowerCase();
    const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' }[ext] || 'image/jpeg';
    result = await ingestWithVision(buf, mime);
  } else {
    console.error('Unknown flag:', flag); process.exit(1);
  }

  console.timeEnd('ingestion');
  console.log('\n=== RESULT ===');
  console.log('Method:', result.method);
  console.log('Text length:', result.text.length, 'chars');
  if (result.page_count) console.log('Pages:', result.page_count);
  if (result.detected_topics) console.log('Topics:', result.detected_topics);
  if (result.language) console.log('Language:', result.language);
  const chunks = chunkText(result.text);
  console.log('Chunks:', chunks.length);
  console.log('\nFirst 500 chars:\n', result.text.slice(0, 500));
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
```

- [ ] **Step 2: Test with real content**

```bash
cd backend
node scripts/test-ingestion.js --url https://es.wikipedia.org/wiki/Fracci%C3%B3n
```

Expected: Method `url`, text > 1000 chars, chunks ≥ 2.

```bash
node scripts/test-ingestion.js --pdf /path/to/your-test.pdf
```

Expected: Method `native` or `vision`, topics array, chunks list.

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/test-ingestion.js
git commit -m "feat: CLI ingestion test tool for cost validation"
```

---

## Phase B — Content Storage + Source Management API

### Task B1: Database migrations

**Files:**
- Create: `backend/db/migrations/002_study_content.sql`
- Create: `backend/db/migrations/003_generated_questions.sql`
- Create: `backend/db/migrations/004_dynamic_nodes.sql`

- [ ] **Step 1: Write 002_study_content.sql**

```sql
-- backend/db/migrations/002_study_content.sql
CREATE TABLE IF NOT EXISTS study_sources (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuari_id    INT NOT NULL,
  titol        VARCHAR(255) NOT NULL,
  tipus        ENUM('pdf_native','pdf_scanned','image','url') NOT NULL,
  url_origen   VARCHAR(2000) DEFAULT NULL,
  language     VARCHAR(10) DEFAULT 'es',
  total_chars  INT DEFAULT 0,
  total_chunks INT DEFAULT 0,
  estat        ENUM('processant','llest','error') NOT NULL DEFAULT 'processant',
  error_msg    TEXT DEFAULT NULL,
  creat_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sources_usuari (usuari_id),
  FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS source_chunks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  source_id  INT NOT NULL,
  ordre      INT NOT NULL,
  text_chunk MEDIUMTEXT NOT NULL,
  INDEX idx_chunks_source (source_id),
  FOREIGN KEY (source_id) REFERENCES study_sources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_topics (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  source_id INT NOT NULL,
  nom       VARCHAR(255) NOT NULL,
  ordre     INT NOT NULL,
  INDEX idx_topics_source (source_id),
  FOREIGN KEY (source_id) REFERENCES study_sources(id) ON DELETE CASCADE
);
```

- [ ] **Step 2: Write 003_generated_questions.sql**

```sql
-- backend/db/migrations/003_generated_questions.sql
-- pregunta_json schemas by tipus:
--   test:            { enunciat, opcions[4], index_correcte(0-3), explicacio, dificultat(1-3) }
--   desenvolupament: { enunciat, rubrica[strings], resposta_model, dificultat }
--   matematiques:    { enunciat, solucio_passos[strings], resultat_final, criteris_avaluacio[strings], dificultat }

CREATE TABLE IF NOT EXISTS generated_questions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuari_id    INT NOT NULL,
  source_id    INT NOT NULL,
  chunk_id     INT NOT NULL,
  tipus        ENUM('test','desenvolupament','matematiques') NOT NULL,
  dificultat   TINYINT DEFAULT 2,
  pregunta_json JSON NOT NULL,
  creat_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_gq_usuari_source (usuari_id, source_id),
  INDEX idx_gq_chunk (chunk_id),
  FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES study_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (chunk_id) REFERENCES source_chunks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sr_generated (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  usuari_id             INT NOT NULL,
  generated_question_id INT NOT NULL,
  propera_revisio       DATE NOT NULL DEFAULT (CURRENT_DATE),
  interval_dies         INT DEFAULT 1,
  consecutives_correctes INT DEFAULT 0,
  UNIQUE KEY uq_sr_gen (usuari_id, generated_question_id),
  FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_question_id) REFERENCES generated_questions(id) ON DELETE CASCADE
);
```

- [ ] **Step 3: Write 004_dynamic_nodes.sql**

```sql
-- backend/db/migrations/004_dynamic_nodes.sql
CREATE TABLE IF NOT EXISTS user_study_nodes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  usuari_id        INT NOT NULL,
  source_id        INT NOT NULL,
  topic_id         INT NOT NULL,
  node_key         VARCHAR(200) NOT NULL,
  titol            VARCHAR(255) NOT NULL,
  ordre            INT NOT NULL DEFAULT 0,
  estat            ENUM('disponible','completat','dominat') NOT NULL DEFAULT 'disponible',
  millor_puntuacio INT DEFAULT 0,
  xp_acumulat      INT DEFAULT 0,
  INDEX idx_usn_usuari (usuari_id),
  INDEX idx_usn_source (source_id),
  UNIQUE KEY uq_usn_topic (usuari_id, topic_id),
  FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES study_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES study_topics(id) ON DELETE CASCADE
);
```

- [ ] **Step 4: Run all three migrations**

```bash
mysql -u root -p pacfgm_dev < backend/db/migrations/002_study_content.sql
mysql -u root -p pacfgm_dev < backend/db/migrations/003_generated_questions.sql
mysql -u root -p pacfgm_dev < backend/db/migrations/004_dynamic_nodes.sql
```

Expected: No errors each time.

- [ ] **Step 5: Verify**

```bash
mysql -u root -p pacfgm_dev -e "SHOW TABLES LIKE 'study%'; SHOW TABLES LIKE 'source%'; SHOW TABLES LIKE 'generated%'; SHOW TABLES LIKE 'sr_generated'; SHOW TABLES LIKE 'user_study%';"
```

Expected: 7 tables listed.

- [ ] **Step 6: Commit**

```bash
git add backend/db/migrations/002_study_content.sql backend/db/migrations/003_generated_questions.sql backend/db/migrations/004_dynamic_nodes.sql
git commit -m "feat: migrations — study_sources, chunks, topics, generated_questions, sr_generated, user_study_nodes"
```

---

### Task B2: Source controller + routes

**Files:**
- Create: `backend/controllers/source.controller.js`
- Create: `backend/routes/source.routes.js`
- Modify: `backend/app.js`

- [ ] **Step 1: Create source.controller.js**

```javascript
// backend/controllers/source.controller.js
import db from '../db/connection.js';
import { ingestPDF, ingestWithVision, ingestURL, chunkText } from '../services/ingestion.service.js';
import { generateQuestionsForSource } from '../services/questionGenerator.service.js';

export async function uploadFile(req, res) {
  const usuariId = req.user.id;
  const { base64, mime_type, titol } = req.body;

  if (!base64 || !mime_type || !titol)
    return res.status(400).json({ error: 'base64, mime_type i titol son obligatoris' });

  const allowed = ['application/pdf','image/jpeg','image/png','image/webp','image/heic'];
  if (!allowed.includes(mime_type))
    return res.status(400).json({ error: `Tipus no suportat: ${mime_type}` });

  const tipusInitial = mime_type === 'application/pdf' ? 'pdf_native' : 'image';
  const [ins] = await db.execute(
    'INSERT INTO study_sources (usuari_id, titol, tipus, estat) VALUES (?, ?, ?, ?)',
    [usuariId, titol, tipusInitial, 'processant']
  );
  const sourceId = ins.insertId;
  res.json({ source_id: sourceId, estat: 'processant' });

  setImmediate(async () => {
    try {
      const buffer = Buffer.from(base64, 'base64');
      let result = mime_type === 'application/pdf'
        ? await ingestPDF(buffer)
        : await ingestWithVision(buffer, mime_type);

      const chunks = chunkText(result.text);
      const topics = result.detected_topics ?? [];
      const tipusDb = mime_type === 'application/pdf'
        ? (result.method === 'vision' ? 'pdf_scanned' : 'pdf_native')
        : 'image';

      await _saveIngestionResult({ sourceId, result, chunks, topics, tipusDb, usuariId });
      await generateQuestionsForSource(sourceId, usuariId, result.language ?? 'es');
    } catch (err) {
      console.error(`[source] Error source ${sourceId}:`, err.message);
      await db.execute(
        'UPDATE study_sources SET estat=?, error_msg=? WHERE id=?',
        ['error', err.message.slice(0, 500), sourceId]
      );
    }
  });
}

export async function uploadURL(req, res) {
  const usuariId = req.user.id;
  const { url, titol } = req.body;
  if (!url) return res.status(400).json({ error: 'url es obligatoria' });
  try { new URL(url); } catch { return res.status(400).json({ error: 'URL no válida' }); }

  const [ins] = await db.execute(
    'INSERT INTO study_sources (usuari_id, titol, tipus, url_origen, estat) VALUES (?, ?, ?, ?, ?)',
    [usuariId, titol || url.slice(0, 100), 'url', url, 'processant']
  );
  const sourceId = ins.insertId;
  res.json({ source_id: sourceId, estat: 'processant' });

  setImmediate(async () => {
    try {
      const result = await ingestURL(url);
      const chunks = chunkText(result.text);
      await _saveIngestionResult({ sourceId, result, chunks, topics: [], tipusDb: 'url', usuariId });
      await generateQuestionsForSource(sourceId, usuariId, 'es');
    } catch (err) {
      console.error(`[source] Error URL ${url}:`, err.message);
      await db.execute(
        'UPDATE study_sources SET estat=?, error_msg=? WHERE id=?',
        ['error', err.message.slice(0, 500), sourceId]
      );
    }
  });
}

export async function listSources(req, res) {
  const [rows] = await db.execute(
    'SELECT id,titol,tipus,url_origen,language,total_chars,total_chunks,estat,error_msg,creat_at FROM study_sources WHERE usuari_id=? ORDER BY creat_at DESC',
    [req.user.id]
  );
  res.json({ sources: rows });
}

export async function getSource(req, res) {
  const [[source]] = await db.execute(
    'SELECT * FROM study_sources WHERE id=? AND usuari_id=?',
    [parseInt(req.params.id), req.user.id]
  );
  if (!source) return res.status(404).json({ error: 'Font no trobada' });
  const [topics] = await db.execute(
    'SELECT id,nom,ordre FROM study_topics WHERE source_id=? ORDER BY ordre',
    [source.id]
  );
  res.json({ source, topics });
}

export async function deleteSource(req, res) {
  const [[source]] = await db.execute(
    'SELECT id FROM study_sources WHERE id=? AND usuari_id=?',
    [parseInt(req.params.id), req.user.id]
  );
  if (!source) return res.status(404).json({ error: 'Font no trobada' });
  await db.execute('DELETE FROM study_sources WHERE id=?', [source.id]);
  res.json({ deleted: true });
}

export async function getStatus(req, res) {
  const [[source]] = await db.execute(
    'SELECT estat,error_msg,total_chunks FROM study_sources WHERE id=? AND usuari_id=?',
    [parseInt(req.params.id), req.user.id]
  );
  if (!source) return res.status(404).json({ error: 'Font no trobada' });
  res.json(source);
}

async function _saveIngestionResult({ sourceId, result, chunks, topics, tipusDb, usuariId }) {
  if (chunks.length > 0) {
    await db.query(
      'INSERT INTO source_chunks (source_id, ordre, text_chunk) VALUES ?',
      [chunks.map((c, i) => [sourceId, i, c])]
    );
  }
  if (topics.length > 0) {
    await db.query(
      'INSERT INTO study_topics (source_id, nom, ordre) VALUES ?',
      [topics.map((nom, i) => [sourceId, nom.slice(0, 255), i])]
    );
    // Create RPG quest nodes for each topic
    const [topicRows] = await db.execute(
      'SELECT id, nom, ordre FROM study_topics WHERE source_id=? ORDER BY ordre',
      [sourceId]
    );
    if (topicRows.length > 0) {
      await db.query(
        'INSERT IGNORE INTO user_study_nodes (usuari_id, source_id, topic_id, node_key, titol, ordre) VALUES ?',
        [topicRows.map(t => [usuariId, sourceId, t.id, `source-${sourceId}-topic-${t.ordre}`, t.nom.slice(0, 255), t.ordre])]
      );
    }
  }
  await db.execute(
    "UPDATE study_sources SET estat='llest', tipus=?, language=?, total_chars=?, total_chunks=? WHERE id=?",
    [tipusDb, result.language ?? 'es', result.text.length, chunks.length, sourceId]
  );
}
```

- [ ] **Step 2: Create source.routes.js**

```javascript
// backend/routes/source.routes.js
import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { uploadFile, uploadURL, listSources, getSource, deleteSource, getStatus } from '../controllers/source.controller.js';

const router = express.Router();
router.use(authMiddleware);

router.post('/upload-file', uploadFile);
router.post('/upload-url', uploadURL);
router.get('/', listSources);
router.get('/:id', getSource);
router.delete('/:id', deleteSource);
router.get('/:id/status', getStatus);

export default router;
```

- [ ] **Step 3: Register in app.js**

Find the existing route registrations in `backend/app.js` and add:

```javascript
import sourceRoutes from './routes/source.routes.js';
// after existing app.use('/api/...') lines:
app.use('/api/sources', sourceRoutes);
```

- [ ] **Step 4: Smoke test**

```bash
# Start backend
node app.js &
# Login and get TOKEN first, then:
curl -X POST http://localhost:3000/api/sources/upload-url \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://es.wikipedia.org/wiki/Fracci%C3%B3n"}'
# Expected: {"source_id":1,"estat":"processant"}

sleep 15 && curl http://localhost:3000/api/sources/1/status -H "Authorization: Bearer TOKEN"
# Expected: {"estat":"llest","total_chunks":N}
```

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/source.controller.js backend/routes/source.routes.js backend/app.js
git commit -m "feat: source upload API — file + URL ingestion, CRUD, auto node creation"
```

---

### Task B3: Frontend — MyContent page

**Files:**
- Create: `frontend/src/components/Sources/UploadZone.jsx`
- Create: `frontend/src/components/Sources/SourceList.jsx`
- Create: `frontend/src/pages/MyContent.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create UploadZone.jsx**

```jsx
// frontend/src/components/Sources/UploadZone.jsx
import { useState } from 'react';
import api from '../../services/api.js';

const ALLOWED_TYPES = ['application/pdf','image/jpeg','image/png','image/webp','image/heic'];

export default function UploadZone({ onUploadStarted }) {
  const [urlInput, setUrlInput] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(file) {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type))
      return setError(`Tipo no soportado: ${file.type}`);
    if (file.size > 20 * 1024 * 1024)
      return setError('El archivo supera los 20 MB.');

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await api.post('/sources/upload-file', { base64, mime_type: file.type, titol: file.name });
      onUploadStarted(res.data.source_id);
    } catch (e) {
      setError(e.message || 'Error al subir.');
    } finally {
      setUploading(false);
    }
  }

  async function handleURL(e) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setError(null); setUploading(true);
    try {
      const res = await api.post('/sources/upload-url', { url: urlInput.trim() });
      onUploadStarted(res.data.source_id);
      setUrlInput('');
    } catch (e) {
      setError(e.message || 'Error al procesar la URL.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
        onClick={() => document.getElementById('file-input').click()}
        style={{
          border: `2px dashed ${dragging ? '#6366f1' : '#4b5563'}`,
          borderRadius: 12, padding: '40px 24px', textAlign: 'center',
          cursor: 'pointer', background: dragging ? '#1e1b4b' : 'transparent', transition: 'all .2s'
        }}
      >
        <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
          style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <p style={{ color: '#9ca3af', margin: 0 }}>
          {uploading ? 'Subiendo...' : 'Arrastra un PDF o imagen, o haz clic para seleccionar'}
        </p>
        <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>PDF, JPG, PNG, WebP · Máx. 20 MB</p>
      </div>

      <form onSubmit={handleURL} style={{ display: 'flex', gap: 8 }}>
        <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
          placeholder="https://ejemplo.com/tema"
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #374151', background: '#111827', color: '#f9fafb', fontSize: 15 }} />
        <button type="submit" disabled={uploading || !urlInput.trim()}
          style={{ padding: '10px 20px', borderRadius: 8, background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer', fontSize: 15 }}>
          Importar URL
        </button>
      </form>
      {error && <p style={{ color: '#f87171', margin: 0, fontSize: 14 }}>{error}</p>}
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
```

- [ ] **Step 2: Create SourceList.jsx**

```jsx
// frontend/src/components/Sources/SourceList.jsx
import { useEffect, useState } from 'react';
import api from '../../services/api.js';

const STATUS = { processant: { label: 'Procesando...', color: '#f59e0b' }, llest: { label: 'Listo', color: '#10b981' }, error: { label: 'Error', color: '#ef4444' } };
const TIPUS = { pdf_native: 'PDF', pdf_scanned: 'PDF escaneado', image: 'Imagen', url: 'URL' };

export default function SourceList({ refreshSignal }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [refreshSignal]);

  useEffect(() => {
    if (!sources.some(s => s.estat === 'processant')) return;
    const t = setTimeout(load, 3000);
    return () => clearTimeout(t);
  }, [sources]);

  async function load() {
    try {
      const res = await api.get('/sources');
      setSources(res.data.sources || []);
    } finally { setLoading(false); }
  }

  async function del(id) {
    if (!confirm('¿Eliminar este contenido y todas sus preguntas?')) return;
    await api.delete(`/sources/${id}`);
    setSources(p => p.filter(s => s.id !== id));
  }

  if (loading) return <p style={{ color: '#9ca3af' }}>Cargando...</p>;
  if (!sources.length) return <p style={{ color: '#6b7280' }}>Aún no has subido contenido.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sources.map(s => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#1f2937', borderRadius: 10, border: '1px solid #374151' }}>
          <span style={{ fontSize: 12, color: '#6b7280', minWidth: 90 }}>{TIPUS[s.tipus] || s.tipus}</span>
          <span style={{ flex: 1, color: '#f9fafb', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.titol}</span>
          {s.total_chunks > 0 && <span style={{ fontSize: 12, color: '#9ca3af' }}>{s.total_chunks} partes</span>}
          <span style={{ fontSize: 12, color: STATUS[s.estat]?.color || '#9ca3af', minWidth: 100, textAlign: 'right' }}>
            {STATUS[s.estat]?.label || s.estat}
          </span>
          {s.estat !== 'processant' && (
            <button onClick={() => del(s.id)}
              style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20, padding: '0 4px', lineHeight: 1 }}>×</button>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create MyContent.jsx**

```jsx
// frontend/src/pages/MyContent.jsx
import { useState } from 'react';
import UploadZone from '../components/Sources/UploadZone.jsx';
import SourceList from '../components/Sources/SourceList.jsx';

export default function MyContent() {
  const [sig, setSig] = useState(0);
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ color: '#f9fafb', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Mi contenido de estudio</h1>
      <p style={{ color: '#9ca3af', marginBottom: 32, fontSize: 15 }}>
        Sube PDFs, fotos de apuntes o URLs. La IA extraerá el contenido y generará preguntas automáticamente.
      </p>
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ color: '#d1d5db', fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Añadir contenido</h2>
        <UploadZone onUploadStarted={() => setSig(p => p + 1)} />
      </section>
      <section>
        <h2 style={{ color: '#d1d5db', fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Contenido subido</h2>
        <SourceList refreshSignal={sig} />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Register route in App.jsx**

Open `frontend/src/App.jsx`. Add import and route:

```jsx
import MyContent from './pages/MyContent.jsx';
// inside <Routes>:
<Route path="/my-content" element={<MyContent />} />
```

- [ ] **Step 5: Start dev server and test manually**

```bash
cd frontend && npm run dev
# Visit http://localhost:5173/my-content
```

Test: import a URL → source appears as "Procesando..." → auto-refreshes to "Listo" after ~10s → delete works.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/MyContent.jsx frontend/src/components/ frontend/src/App.jsx
git commit -m "feat: MyContent page — upload PDF/image/URL, status polling, delete"
```

---

## Phase C — Question Generator

### Task C1: Question generator service

**Files:**
- Create: `backend/services/questionGenerator.service.js`
- Create: `backend/tests/questionGenerator.service.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// backend/tests/questionGenerator.service.test.js
import { jest } from '@jest/globals';
global.fetch = jest.fn();

describe('questionGenerator.service — generateTestQuestion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns valid test question', async () => {
    const mock = { enunciat: '¿Cuánto es 1/2+1/3?', opcions: ['1/5','2/5','5/6','2/6'], index_correcte: 2, explicacio: 'MCM...', dificultat: 2 };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(mock) }] } }] })
    });
    const { generateTestQuestion } = await import('../services/questionGenerator.service.js');
    const result = await generateTestQuestion('Las fracciones son...', 'es');
    expect(result.opcions).toHaveLength(4);
    expect(result.index_correcte).toBeGreaterThanOrEqual(0);
    expect(result.index_correcte).toBeLessThanOrEqual(3);
  });

  it('throws on Gemini error', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'error' });
    const { generateTestQuestion } = await import('../services/questionGenerator.service.js');
    await expect(generateTestQuestion('text', 'es')).rejects.toThrow('Gemini error 500');
  });
});
```

- [ ] **Step 2: Verify it fails**

```bash
npx jest tests/questionGenerator.service.test.js --no-coverage
```

Expected: FAIL — module not found

- [ ] **Step 3: Create the service**

```javascript
// backend/services/questionGenerator.service.js
import db from '../db/connection.js';

const MODEL = 'gemini-2.5-flash';

const TEST_SCHEMA = {
  type: 'object',
  properties: {
    enunciat: { type: 'string' },
    opcions: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
    index_correcte: { type: 'integer', minimum: 0, maximum: 3 },
    explicacio: { type: 'string' },
    dificultat: { type: 'integer', minimum: 1, maximum: 3 }
  },
  required: ['enunciat', 'opcions', 'index_correcte', 'explicacio', 'dificultat']
};

const DESENVOLUPAMENT_SCHEMA = {
  type: 'object',
  properties: {
    enunciat: { type: 'string' },
    rubrica: { type: 'array', items: { type: 'string' } },
    resposta_model: { type: 'string' },
    dificultat: { type: 'integer', minimum: 1, maximum: 3 }
  },
  required: ['enunciat', 'rubrica', 'resposta_model', 'dificultat']
};

async function _callGemini(prompt, schema) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048, responseMimeType: 'application/json', responseSchema: schema }
      })
    }
  );
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Gemini error ${response.status}: ${t}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.filter(p => p.text && !p.thought)?.map(p => p.text)?.join('') ?? '';
  return JSON.parse(text);
}

export async function generateTestQuestion(chunkText, language = 'es') {
  const lang = language === 'ca' ? 'en català' : language === 'es' ? 'en castellano' : 'in English';
  const prompt = `Eres un profesor experto. A partir del siguiente fragmento, genera UNA pregunta tipo test con 4 opciones ${lang}. Una sola respuesta correcta. dificultat: 1=fácil(dato directo), 2=normal(comprensión), 3=difícil(análisis).

TEXTO:
${chunkText.slice(0, 3000)}`;
  return _callGemini(prompt, TEST_SCHEMA);
}

export async function generateDevelopmentQuestion(chunkText, language = 'es') {
  const lang = language === 'ca' ? 'en català' : language === 'es' ? 'en castellano' : 'in English';
  const prompt = `Eres un profesor experto. A partir del siguiente fragmento, genera UNA pregunta de desarrollo con rúbrica de 3-5 criterios específicos y medibles ${lang}.

TEXTO:
${chunkText.slice(0, 3000)}`;
  return _callGemini(prompt, DESENVOLUPAMENT_SCHEMA);
}

export async function generateQuestionsForSource(sourceId, usuariId, language = 'es') {
  const [chunks] = await db.execute(
    'SELECT id, text_chunk FROM source_chunks WHERE source_id=? ORDER BY ordre',
    [sourceId]
  );

  let generated = 0, errors = 0;

  for (const chunk of chunks) {
    try {
      const q = await generateTestQuestion(chunk.text_chunk, language);
      await db.execute(
        'INSERT INTO generated_questions (usuari_id, source_id, chunk_id, tipus, dificultat, pregunta_json) VALUES (?,?,?,?,?,?)',
        [usuariId, sourceId, chunk.id, 'test', q.dificultat, JSON.stringify(q)]
      );
      generated++;
    } catch (err) {
      console.error(`[questionGen] test chunk ${chunk.id}:`, err.message);
      errors++;
    }

    if (chunk.text_chunk.length > 500) {
      try {
        const q = await generateDevelopmentQuestion(chunk.text_chunk, language);
        await db.execute(
          'INSERT INTO generated_questions (usuari_id, source_id, chunk_id, tipus, dificultat, pregunta_json) VALUES (?,?,?,?,?,?)',
          [usuariId, sourceId, chunk.id, 'desenvolupament', q.dificultat, JSON.stringify(q)]
        );
        generated++;
      } catch (err) {
        console.error(`[questionGen] dev chunk ${chunk.id}:`, err.message);
        errors++;
      }
    }

    await new Promise(r => setTimeout(r, 200));
  }

  return { generated, errors };
}
```

- [ ] **Step 4: Verify tests pass**

```bash
npx jest tests/questionGenerator.service.test.js --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/services/questionGenerator.service.js backend/tests/questionGenerator.service.test.js
git commit -m "feat: question generator service — test + development questions, JSON schema"
```

---

## Phase D — RPG Layer Adaptation

### Task D1: Study sessions from generated questions

**Files:**
- Modify: `backend/controllers/pregunta.controller.js`
- Modify: `backend/routes/pregunta.routes.js`

- [ ] **Step 1: Read the existing session start function**

Open `backend/controllers/pregunta.controller.js` and note the exact function name for session start (around line 284) and how it inserts into `sessions_estudi`.

- [ ] **Step 2: Add `generarSessioFromSource` function**

After the existing session start function, add:

```javascript
export async function generarSessioFromSource(req, res) {
  const usuariId = req.user.id;
  const { source_id, node_key } = req.body;
  if (!source_id) return res.status(400).json({ error: 'source_id is required' });

  const [[source]] = await db.execute(
    "SELECT id, language FROM study_sources WHERE id=? AND usuari_id=? AND estat='llest'",
    [source_id, usuariId]
  );
  if (!source) return res.status(404).json({ error: 'Font no disponible' });

  const [due] = await db.execute(
    `SELECT gq.id, gq.tipus, gq.pregunta_json, gq.dificultat,
            COALESCE(sr.consecutives_correctes, 0) as consecutives_correctes
     FROM generated_questions gq
     LEFT JOIN sr_generated sr ON sr.generated_question_id=gq.id AND sr.usuari_id=?
     WHERE gq.source_id=? AND gq.usuari_id=?
       AND (sr.propera_revisio IS NULL OR sr.propera_revisio <= CURDATE())
     ORDER BY sr.propera_revisio ASC
     LIMIT 5`,
    [usuariId, source_id, usuariId]
  );

  if (!due.length) return res.json({ all_caught_up: true, message: 'No hay preguntas pendientes. ¡Todo al día!' });

  const [ins] = await db.execute(
    'INSERT INTO sessions_estudi (usuari_id, node_id, completada) VALUES (?,?,0)',
    [usuariId, node_key || `source-${source_id}`]
  );

  res.json({
    sessio_id: ins.insertId,
    is_generated: true,
    preguntes: due.map((q, i) => ({
      numero: i + 1,
      id: q.id,
      tipus: q.tipus,
      consecutives_correctes: q.consecutives_correctes,
      ...JSON.parse(q.pregunta_json)
    }))
  });
}
```

- [ ] **Step 3: Add `respondreGeneratedQuestion` function**

```javascript
const SR_INTERVALS = [1, 3, 7, 14, 30];

export async function respondreGeneratedQuestion(req, res) {
  const usuariId = req.user.id;
  const { generated_question_id, correcte } = req.body;
  if (!generated_question_id) return res.status(400).json({ error: 'generated_question_id required' });

  const [[existing]] = await db.execute(
    'SELECT id, consecutives_correctes FROM sr_generated WHERE usuari_id=? AND generated_question_id=?',
    [usuariId, generated_question_id]
  );

  const newConsecutives = correcte ? Math.min((existing?.consecutives_correctes ?? 0) + 1, 4) : 0;
  const interval = SR_INTERVALS[newConsecutives];
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const nextDateStr = nextDate.toISOString().split('T')[0];

  if (existing) {
    await db.execute(
      'UPDATE sr_generated SET consecutives_correctes=?, interval_dies=?, propera_revisio=? WHERE usuari_id=? AND generated_question_id=?',
      [newConsecutives, interval, nextDateStr, usuariId, generated_question_id]
    );
  } else {
    await db.execute(
      'INSERT INTO sr_generated (usuari_id, generated_question_id, consecutives_correctes, interval_dies, propera_revisio) VALUES (?,?,?,?,?)',
      [usuariId, generated_question_id, newConsecutives, interval, nextDateStr]
    );
  }

  res.json({ correcte, consecutives_correctes: newConsecutives, propera_revisio: nextDateStr, interval_dies: interval });
}
```

- [ ] **Step 4: Register in routes**

Open `backend/routes/pregunta.routes.js`. Add imports and routes:

```javascript
import { generarSessioFromSource, respondreGeneratedQuestion } from '../controllers/pregunta.controller.js';
// inside the router:
router.post('/generar-from-source', generarSessioFromSource);
router.post('/resposta-generated', respondreGeneratedQuestion);
```

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/pregunta.controller.js backend/routes/pregunta.routes.js
git commit -m "feat: study sessions from generated questions with SM-2 spaced repetition"
```

---

### Task D2: Expose dynamic nodes via progress API

**Files:**
- Modify: `backend/controllers/progres.controller.js`
- Modify: `backend/routes/progres.routes.js`

- [ ] **Step 1: Add `getUserStudyNodes` to progres.controller.js**

Open `backend/controllers/progres.controller.js`. At the end, before the export, add:

```javascript
export async function getUserStudyNodes(req, res) {
  const usuariId = req.user.id;
  const [nodes] = await db.execute(
    `SELECT n.id, n.node_key, n.titol, n.ordre, n.estat, n.millor_puntuacio, n.xp_acumulat,
            s.titol as source_titol, s.id as source_id,
            COUNT(DISTINCT gq.id) as total_preguntes,
            SUM(CASE WHEN sr.consecutives_correctes >= 4 THEN 1 ELSE 0 END) as dominades
     FROM user_study_nodes n
     JOIN study_sources s ON n.source_id = s.id
     LEFT JOIN generated_questions gq ON gq.source_id = s.id AND gq.usuari_id = ?
     LEFT JOIN sr_generated sr ON sr.generated_question_id = gq.id AND sr.usuari_id = ?
     WHERE n.usuari_id = ?
     GROUP BY n.id
     ORDER BY s.id ASC, n.ordre ASC`,
    [usuariId, usuariId, usuariId]
  );
  res.json({ nodes });
}
```

- [ ] **Step 2: Register the endpoint**

Open `backend/routes/progres.routes.js`. Add:

```javascript
import { getUserStudyNodes } from '../controllers/progres.controller.js';
router.get('/my-nodes', getUserStudyNodes);
```

- [ ] **Step 3: Smoke test**

```bash
curl http://localhost:3000/api/progres/my-nodes -H "Authorization: Bearer TOKEN"
# After uploading content: {"nodes":[{...topic nodes...}]}
```

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/progres.controller.js backend/routes/progres.routes.js
git commit -m "feat: /api/progres/my-nodes — dynamic quest nodes from uploaded content"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| Upload PDFs (native + scanned) | A2, A3, B2 |
| Upload photos of pages | A3 (`ingestWithVision`), B2 |
| Upload URLs | A3, B2 |
| Type test questions | C1 |
| Type development questions | C1 |
| Math photo evaluation | Existing `analitzarDesenvolupament` reused as-is — no new code needed. Wire via `generated_questions.tipus='matematiques'` in follow-up sprint. |
| RPG + spaced repetition with dynamic content | D1, D2 |
| Topics → quest worlds | B2 (`_saveIngestionResult`), D2 |
| Don't store original images | Only `buffer.toString('base64')` passed to Gemini; buffer never persisted |
| Gemini context caching | Not used — spec explicitly recommends against depending on it |
| Cost validation tool | A4 |
| Multi-user isolation | All queries filter by `usuari_id` |

**Known gaps (follow-up sprints):**
1. Math questions wiring — `generated_questions.tipus='matematiques'` + reuse existing Vision eval
2. Frontend quest screen rendering `user_study_nodes` as playable worlds
3. Worker retry logic — `setImmediate` has no retry; BullMQ recommended for production
4. Phase E — Multi-user auth hardening, RGPD, parental consent (required before public launch)

**Placeholder scan:** No TBD/TODO in code blocks. All steps have complete, runnable code.

**Type consistency:** `generated_question_id`, `source_id`, `usuari_id`, `consecutives_correctes` consistent across all functions.
