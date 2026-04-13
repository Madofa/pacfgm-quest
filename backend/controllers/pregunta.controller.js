const pool = require('../db/connection');
const { NODES } = require('../data/skillTree');
const { generarPregunta, analitzarDesenvolupament } = require('../services/gemini.service');
const { calcularNivell, calcularRang, calcularXpSessio } = require('../utils/xp');

// Intervals SR per pregunta individual (dies)
// Index = acierts consecutius (0 = acabada de fallar, 4 = dominada)
const SR_Q_INTERVALS = [1, 3, 7, 14, 30];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function parseOpcions(raw) {
  if (!raw) return [];
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  // Format antic: { opcions: [...], explicacio: "..." }
  // Format nou: [...]
  return Array.isArray(parsed) ? parsed : (parsed.opcions || []);
}

function parseExplicacio(preg) {
  // Format nou: columna explicacio directa
  if (preg.explicacio) return preg.explicacio;
  // Format antic: dins opcions JSON
  try {
    const parsed = typeof preg.opcions === 'string' ? JSON.parse(preg.opcions) : preg.opcions;
    return parsed?.explicacio || '';
  } catch { return ''; }
}

async function actualitzarSR(usuariId, preguntaBankId, esCorrecte) {
  const [srRows] = await pool.query(
    'SELECT * FROM sr_pregunta WHERE usuari_id = ? AND pregunta_id = ?',
    [usuariId, preguntaBankId]
  );

  const avui = new Date().toISOString().split('T')[0];

  if (srRows.length === 0) {
    const consecutives = esCorrecte ? 1 : 0;
    const interval = SR_Q_INTERVALS[Math.min(consecutives, SR_Q_INTERVALS.length - 1)];
    const dataRevisio = new Date();
    dataRevisio.setDate(dataRevisio.getDate() + interval);
    await pool.query(
      `INSERT INTO sr_pregunta
         (usuari_id, pregunta_id, propera_revisio, interval_dies, num_revisions, consecutives_correctes)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [usuariId, preguntaBankId, dataRevisio.toISOString().split('T')[0], interval, consecutives]
    );
  } else {
    const sr = srRows[0];
    const consecutives = esCorrecte
      ? Math.min(sr.consecutives_correctes + 1, SR_Q_INTERVALS.length - 1)
      : 0;
    const interval = SR_Q_INTERVALS[consecutives];
    const dataRevisio = new Date();
    dataRevisio.setDate(dataRevisio.getDate() + interval);
    await pool.query(
      `UPDATE sr_pregunta
       SET propera_revisio = ?, interval_dies = ?, num_revisions = num_revisions + 1,
           consecutives_correctes = ?
       WHERE usuari_id = ? AND pregunta_id = ?`,
      [dataRevisio.toISOString().split('T')[0], interval, consecutives, usuariId, preguntaBankId]
    );
  }
}

// ── HELPERS GENERACIÓ ─────────────────────────────────────────────────────────

async function inserirQaLog(sessioId, slot, q) {
  const opcions = typeof q.opcions === 'string' ? q.opcions : JSON.stringify(q.opcions);
  await pool.query(
    `INSERT INTO preguntes_log
       (sessio_id, numero_pregunta, pregunta_bank_id, pregunta_text, opcions,
        resposta_correcta, explicacio)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [sessioId, slot, q.id, q.pregunta_text, opcions, q.resposta_correcta, q.explicacio]
  );
}

async function generarIInserirUnaQ(sessioId, slot, nodeId, node, idioma, textsUsats) {
  try {
    const q = await generarPregunta(nodeId, node.temari, idioma, textsUsats);
    const [ins] = await pool.query(
      `INSERT INTO preguntes_bank (node_id, pregunta_text, opcions, resposta_correcta, explicacio)
       VALUES (?, ?, ?, ?, ?)`,
      [nodeId, q.pregunta, JSON.stringify(q.opcions), q.correcta, q.explicacio]
    );
    const qRow = {
      id: ins.insertId, pregunta_text: q.pregunta,
      opcions: JSON.stringify(q.opcions), resposta_correcta: q.correcta, explicacio: q.explicacio,
      necessita_desenvolupament: !!q.necessita_desenvolupament,
    };
    await inserirQaLog(sessioId, slot, qRow);
    return qRow;
  } catch (err) {
    console.warn(`[generar] Gemini slot ${slot}: ${err.message} — usant banc`);
    // Excloure preguntes ja vistes en aquesta sessió
    const [usedIds] = await pool.query(
      'SELECT pregunta_bank_id FROM preguntes_log WHERE sessio_id = ? AND pregunta_bank_id IS NOT NULL',
      [sessioId]
    );
    const excludeIds = usedIds.map(r => r.pregunta_bank_id);
    const placeholders = excludeIds.length > 0 ? `AND id NOT IN (${excludeIds.map(() => '?').join(',')})` : '';
    const [bf] = await pool.query(
      `SELECT * FROM preguntes_bank WHERE node_id = ? ${placeholders} ORDER BY RAND() LIMIT 1`,
      [nodeId, ...excludeIds]
    );
    if (bf.length > 0) {
      await inserirQaLog(sessioId, slot, bf[0]);
      return bf[0];
    }
    return null;
  }
}

// Genera els slots pendents en background (crida paral·lela a Gemini)
async function generarQuestionsBackground(sessioId, nodeId, node, idioma, textsUsats, fromSlot) {
  const count = 5 - fromSlot + 1;
  if (count <= 0) return;
  console.log(`[bg] sessió ${sessioId}: generant slots ${fromSlot}-5 en paral·lel`);

  const promises = Array.from({ length: count }, (_, i) =>
    generarPregunta(nodeId, node.temari, idioma, textsUsats)
      .catch(err => { console.warn(`[bg] Gemini slot ${fromSlot + i}: ${err.message}`); return null; })
  );
  const results = await Promise.all(promises);

  for (let i = 0; i < results.length; i++) {
    const slot = fromSlot + i;
    const q = results[i];
    let qRow = null;

    if (q) {
      try {
        const [ins] = await pool.query(
          `INSERT INTO preguntes_bank (node_id, pregunta_text, opcions, resposta_correcta, explicacio)
           VALUES (?, ?, ?, ?, ?)`,
          [nodeId, q.pregunta, JSON.stringify(q.opcions), q.correcta, q.explicacio]
        );
        qRow = { id: ins.insertId, pregunta_text: q.pregunta, opcions: JSON.stringify(q.opcions), resposta_correcta: q.correcta, explicacio: q.explicacio };
      } catch (e) { console.warn(`[bg] bank insert slot ${slot}: ${e.message}`); }
    }

    if (!qRow) {
      const [usedIds] = await pool.query(
        'SELECT pregunta_bank_id FROM preguntes_log WHERE sessio_id = ? AND pregunta_bank_id IS NOT NULL',
        [sessioId]
      );
      const excludeIds = usedIds.map(r => r.pregunta_bank_id);
      const placeholders = excludeIds.length > 0 ? `AND id NOT IN (${excludeIds.map(() => '?').join(',')})` : '';
      const [bf] = await pool.query(
        `SELECT * FROM preguntes_bank WHERE node_id = ? ${placeholders} ORDER BY RAND() LIMIT 1`,
        [nodeId, ...excludeIds]
      );
      if (bf.length > 0) qRow = bf[0];
    }

    if (qRow) {
      try { await inserirQaLog(sessioId, slot, qRow); }
      catch (e) { console.warn(`[bg] log insert slot ${slot}: ${e.message}`); }
    }
  }
  console.log(`[bg] sessió ${sessioId}: slots ${fromSlot}-5 completats`);
}

// ── GENERAR ───────────────────────────────────────────────────────────────────

async function generar(req, res) {
  const { node_id, idioma = 'catala' } = req.body;
  const usuariId = req.usuari.id;

  if (!node_id) return res.status(400).json({ error: 'Falta node_id' });
  const node = NODES[node_id];
  if (!node) return res.status(404).json({ error: 'Node no trobat' });

  try {
    // Verificar accés
    const [progresRows] = await pool.query(
      'SELECT estat FROM progres_nodes WHERE usuari_id = ? AND node_id = ?',
      [usuariId, node_id]
    );
    const estat = progresRows.length > 0 ? progresRows[0].estat : 'bloquejat';
    if (estat === 'bloquejat') {
      return res.status(403).json({ error: 'Node bloquejat. Completa el node anterior primer.' });
    }

    // Comprovar si hi ha sessió oberta amb pregunta pendent
    const [openSessions] = await pool.query(
      `SELECT s.id FROM sessions_estudi s
       WHERE s.usuari_id = ? AND s.node_id = ? AND s.completada = FALSE
       ORDER BY s.creat_at DESC LIMIT 1`,
      [usuariId, node_id]
    );

    if (openSessions.length > 0) {
      const sessioId = openSessions[0].id;
      const [pending] = await pool.query(
        `SELECT * FROM preguntes_log WHERE sessio_id = ? AND resposta_alumne IS NULL
         ORDER BY numero_pregunta ASC LIMIT 1`,
        [sessioId]
      );
      if (pending.length > 0) {
        const preg = pending[0];
        return res.json({
          sessio_id: sessioId, numero_pregunta: preg.numero_pregunta,
          total_preguntes: 5, pregunta: preg.pregunta_text, opcions: parseOpcions(preg.opcions),
          necessita_desenvolupament: false,
        });
      }

      // La sessió existeix però el background encara no ha inserit la pròxima pregunta
      const [countRow] = await pool.query(
        'SELECT COUNT(*) AS total FROM preguntes_log WHERE sessio_id = ?', [sessioId]
      );
      const loaded = parseInt(countRow[0].total);
      if (loaded >= 5) {
        return res.status(409).json({ error: 'No hi ha preguntes pendents. Crida /finalitzar.' });
      }

      // Generar on-the-fly la següent (cas rar: l'alumne és molt ràpid)
      const nextSlot = loaded + 1;
      const [textsRows] = await pool.query(
        'SELECT pregunta_text FROM preguntes_log WHERE sessio_id = ?', [sessioId]
      );
      const textsUsats = textsRows.map(r => r.pregunta_text);
      const qRow = await generarIInserirUnaQ(sessioId, nextSlot, node_id, node, idioma, textsUsats);
      if (!qRow) return res.status(500).json({ error: 'Error generant la pregunta' });
      return res.json({
        sessio_id: sessioId, numero_pregunta: nextSlot,
        total_preguntes: 5, pregunta: qRow.pregunta_text, opcions: parseOpcions(qRow.opcions),
        necessita_desenvolupament: !!qRow.necessita_desenvolupament,
      });
    }

    // ── Nova sessió ──────────────────────────────────────────────────────────
    const [newSessio] = await pool.query(
      'INSERT INTO sessions_estudi (usuari_id, node_id) VALUES (?, ?)', [usuariId, node_id]
    );
    const sessioId = newSessio.insertId;

    // 1. Preguntes SR pendents (de la BD, ràpid)
    const avui = new Date().toISOString().split('T')[0];
    const [dueRows] = await pool.query(
      `SELECT pb.id, pb.pregunta_text, pb.opcions, pb.resposta_correcta, pb.explicacio
       FROM sr_pregunta sr JOIN preguntes_bank pb ON pb.id = sr.pregunta_id
       WHERE sr.usuari_id = ? AND pb.node_id = ? AND sr.propera_revisio <= ?
       ORDER BY sr.propera_revisio ASC, sr.consecutives_correctes ASC LIMIT 5`,
      [usuariId, node_id, avui]
    );

    // 2. Inserir preguntes SR al log (operació DB, immediata)
    const textsUsats = [];
    let slotActual = 1;
    for (const q of dueRows) {
      await inserirQaLog(sessioId, slotActual++, q);
      textsUsats.push(q.pregunta_text);
    }

    // Afegir historial recent per evitar repeticions (últimes 20 preguntes d'aquest node)
    const [historialRows] = await pool.query(
      `SELECT DISTINCT pl.pregunta_text
       FROM preguntes_log pl
       JOIN sessions_estudi se ON se.id = pl.sessio_id
       WHERE se.usuari_id = ? AND se.node_id = ? AND se.id != ?
       ORDER BY pl.id DESC LIMIT 20`,
      [usuariId, node_id, sessioId]
    );
    historialRows.forEach(r => {
      if (!textsUsats.includes(r.pregunta_text)) textsUsats.push(r.pregunta_text);
    });

    // 3. Slot 1 de Gemini (si no n'hi ha de SR per slot 1)
    let slot1Q = dueRows.length > 0 ? dueRows[0] : null;

    if (!slot1Q) {
      // Una sola crida Gemini — retornem molt més ràpid que abans
      const qRow = await generarIInserirUnaQ(sessioId, 1, node_id, node, idioma, textsUsats);
      if (!qRow) return res.status(500).json({ error: 'No s\'ha pogut generar la pregunta' });
      slot1Q = qRow;
      textsUsats.push(qRow.pregunta_text);
      slotActual = 2;
    }

    // 4. Retornar slot 1 IMMEDIATAMENT
    res.json({
      sessio_id: sessioId, numero_pregunta: 1,
      total_preguntes: 5, pregunta: slot1Q.pregunta_text, opcions: parseOpcions(slot1Q.opcions),
      necessita_desenvolupament: !!slot1Q.necessita_desenvolupament,
    });

    // 5. Generar slots restants en background (l'alumne respon Q1 mentre es genera)
    if (slotActual <= 5) {
      setImmediate(() => {
        generarQuestionsBackground(sessioId, node_id, node, idioma, textsUsats, slotActual)
          .catch(e => console.error('[bg]', e.message));
      });
    }

  } catch (err) {
    console.error('Error generant pregunta:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Error generant la pregunta' });
    }
  }
}

// ── RESPOSTA ──────────────────────────────────────────────────────────────────

async function resposta(req, res) {
  const { sessio_id, resposta: respostaAlumne, temps_ms = 0 } = req.body;
  const usuariId = req.usuari.id;

  if (!sessio_id || !respostaAlumne) {
    return res.status(400).json({ error: 'Falten sessio_id i resposta' });
  }
  if (!['A', 'B', 'C', 'D'].includes(respostaAlumne.toUpperCase())) {
    return res.status(400).json({ error: 'Resposta ha de ser A, B, C o D' });
  }

  try {
    const [sessions] = await pool.query(
      'SELECT * FROM sessions_estudi WHERE id = ? AND usuari_id = ?',
      [sessio_id, usuariId]
    );
    if (sessions.length === 0) return res.status(404).json({ error: 'Sessió no trobada' });
    if (sessions[0].completada) return res.status(409).json({ error: 'Sessió ja completada' });

    // Obtenir la pròxima pregunta sense respondre
    const [preguntes] = await pool.query(
      `SELECT * FROM preguntes_log
       WHERE sessio_id = ? AND resposta_alumne IS NULL
       ORDER BY numero_pregunta ASC LIMIT 1`,
      [sessio_id]
    );
    if (preguntes.length === 0) {
      return res.status(409).json({ error: 'No hi ha preguntes pendents. Crida /finalitzar.' });
    }

    const preg = preguntes[0];
    const esCorrecte = respostaAlumne.toUpperCase() === preg.resposta_correcta;
    const explicacio = parseExplicacio(preg);

    // Desar resposta
    await pool.query(
      `UPDATE preguntes_log
       SET resposta_alumne = ?, correcte = ?, temps_resposta_ms = ?
       WHERE id = ?`,
      [respostaAlumne.toUpperCase(), esCorrecte, temps_ms, preg.id]
    );

    // Actualitzar SR per a aquesta pregunta individual
    if (preg.pregunta_bank_id) {
      await actualitzarSR(usuariId, preg.pregunta_bank_id, esCorrecte);
    }

    const [counts] = await pool.query(
      `SELECT
         COUNT(*)                     AS total,
         SUM(resposta_alumne IS NOT NULL) AS respostes,
         SUM(correcte = TRUE)         AS encerts
       FROM preguntes_log WHERE sessio_id = ?`,
      [sessio_id]
    );

    return res.json({
      correcte:          esCorrecte,
      resposta_correcta: preg.resposta_correcta,
      explicacio,
      progres_sessio: {
        respostes_fetes: parseInt(counts[0].respostes),
        encerts:         parseInt(counts[0].encerts),
        total:           5,
      },
    });
  } catch (err) {
    console.error('Error processant resposta:', err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── FINALITZAR ────────────────────────────────────────────────────────────────

async function finalitzar(req, res) {
  const { sessio_id } = req.body;
  const usuariId = req.usuari.id;

  if (!sessio_id) return res.status(400).json({ error: 'Falta sessio_id' });

  try {
    const [sessions] = await pool.query(
      'SELECT * FROM sessions_estudi WHERE id = ? AND usuari_id = ?',
      [sessio_id, usuariId]
    );
    if (sessions.length === 0) return res.status(404).json({ error: 'Sessió no trobada' });
    if (sessions[0].completada) return res.status(409).json({ error: 'Sessió ja finalitzada' });

    const sessio = sessions[0];

    const [resultats] = await pool.query(
      `SELECT
         COUNT(*)                           AS total,
         SUM(correcte = TRUE)               AS encerts,
         SUM(COALESCE(temps_resposta_ms, 0)) AS total_ms
       FROM preguntes_log WHERE sessio_id = ?`,
      [sessio_id]
    );

    const encerts   = parseInt(resultats[0].encerts) || 0;
    const total     = parseInt(resultats[0].total)   || 5;
    const total_ms  = parseInt(resultats[0].total_ms) || 0;
    const puntuacio = Math.round((encerts / total) * 100);
    const superat   = puntuacio >= 60;

    const [usuaris] = await pool.query('SELECT * FROM usuaris WHERE id = ?', [usuariId]);
    const usuari = usuaris[0];

    // Actualitzar ratxa
    const avui = new Date().toISOString().split('T')[0];
    const ahir = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let novaRacha = 1;
    if (usuari.ultima_sessio === avui)      novaRacha = usuari.racha_dies;
    else if (usuari.ultima_sessio === ahir) novaRacha = usuari.racha_dies + 1;

    const node = NODES[sessio.node_id];
    const xp_guanyat = calcularXpSessio({
      materia:   node?.materia || 'social',
      encerts,
      rachaDies: novaRacha,
      totalMs:   total_ms,
    });

    const nou_xp_total   = usuari.xp_total + xp_guanyat;
    const nou_xp_setmana = usuari.xp_setmana + xp_guanyat;
    const nouNivell      = calcularNivell(nou_xp_total);
    const nouRang        = calcularRang(nouNivell);

    // Tancar sessió
    await pool.query(
      `UPDATE sessions_estudi
       SET completada = TRUE, superat = ?, puntuacio = ?,
           preguntes_correctes = ?, xp_guanyat = ?,
           durada_segons = TIMESTAMPDIFF(SECOND, creat_at, NOW())
       WHERE id = ?`,
      [superat, puntuacio, encerts, xp_guanyat, sessio_id]
    );

    // Actualitzar usuari
    await pool.query(
      `UPDATE usuaris
       SET xp_total = ?, xp_setmana = ?, nivell = ?, rang = ?,
           racha_dies = ?, ultima_sessio = ?
       WHERE id = ?`,
      [nou_xp_total, nou_xp_setmana, nouNivell, nouRang, novaRacha, avui, usuariId]
    );

    // Audit XP
    await pool.query(
      'INSERT INTO xp_log (usuari_id, xp_delta, motiu, referencia) VALUES (?, ?, ?, ?)',
      [usuariId, xp_guanyat, 'sessio_completada', sessio_id]
    );

    // ── Estat del node ────────────────────────────────────────────────────────
    let nodesDesbloquejats = [];

    if (superat) {
      // Comprovar si és la primera vegada que supera el node
      const [existingNode] = await pool.query(
        "SELECT estat FROM progres_nodes WHERE usuari_id = ? AND node_id = ? AND estat IN ('completat','dominat')",
        [usuariId, sessio.node_id]
      );
      const primerCop = existingNode.length === 0;

      // Comprovar si el node mereix estat 'dominat':
      // 3 últimes sessions completades (inclosa aquesta) amb puntuació >= 80
      const [recentSessions] = await pool.query(
        `SELECT puntuacio FROM sessions_estudi
         WHERE usuari_id = ? AND node_id = ? AND completada = TRUE AND superat = TRUE
         ORDER BY creat_at DESC LIMIT 3`,
        [usuariId, sessio.node_id]
      );
      const dominat = recentSessions.length >= 3
        && recentSessions.every(s => s.puntuacio >= 80);

      const nouEstat = dominat ? 'dominat' : 'completat';

      await pool.query(
        `INSERT INTO progres_nodes
           (usuari_id, node_id, estat, intents, millor_puntuacio, xp_acumulat, completat_at)
         VALUES (?, ?, ?, 1, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           estat            = IF(VALUES(estat) = 'dominat', 'dominat',
                               IF(millor_puntuacio < VALUES(millor_puntuacio), VALUES(estat), estat)),
           millor_puntuacio = GREATEST(millor_puntuacio, VALUES(millor_puntuacio)),
           intents          = intents + 1,
           xp_acumulat      = xp_acumulat + VALUES(xp_acumulat),
           completat_at     = COALESCE(completat_at, NOW())`,
        [usuariId, sessio.node_id, nouEstat, puntuacio, xp_guanyat]
      );

      // Desbloquejar fills si és el primer cop que supera
      if (primerCop) {
        for (const fillId of (node?.fills || [])) {
          const [existing] = await pool.query(
            'SELECT estat FROM progres_nodes WHERE usuari_id = ? AND node_id = ?',
            [usuariId, fillId]
          );
          if (existing.length === 0) {
            await pool.query(
              "INSERT INTO progres_nodes (usuari_id, node_id, estat) VALUES (?, ?, 'disponible')",
              [usuariId, fillId]
            );
            nodesDesbloquejats.push(fillId);
          } else if (existing[0].estat === 'bloquejat') {
            await pool.query(
              "UPDATE progres_nodes SET estat = 'disponible' WHERE usuari_id = ? AND node_id = ?",
              [usuariId, fillId]
            );
            nodesDesbloquejats.push(fillId);
          }
        }
      }
    } else {
      await pool.query(
        `INSERT INTO progres_nodes (usuari_id, node_id, estat, intents)
         VALUES (?, ?, 'disponible', 1)
         ON DUPLICATE KEY UPDATE intents = intents + 1`,
        [usuariId, sessio.node_id]
      );
    }

    // Resum SR detallat per pregunta
    const [srDetall] = await pool.query(
      `SELECT
         pl.pregunta_text,
         pl.correcte,
         sr.consecutives_correctes,
         sr.interval_dies,
         sr.propera_revisio
       FROM preguntes_log pl
       LEFT JOIN sr_pregunta sr ON sr.pregunta_id = pl.pregunta_bank_id AND sr.usuari_id = ?
       WHERE pl.sessio_id = ?
       ORDER BY pl.numero_pregunta ASC`,
      [usuariId, sessio_id]
    );

    const srPreguntes = srDetall.map(r => ({
      text:       r.pregunta_text,
      correcte:   !!r.correcte,
      sr_level:   Math.min(r.consecutives_correctes ?? 0, 4),
      interval:   r.interval_dies ?? 1,
      propera:    r.propera_revisio,
    }));

    const dominades     = srPreguntes.filter(p => p.sr_level >= 4).length;
    const pendents_dema = srPreguntes.filter(p => p.sr_level === 0).length;
    const propera_revisio = srDetall.find(r => r.propera_revisio)?.propera_revisio || null;

    return res.json({
      puntuacio,
      superat,
      xp_guanyat,
      node_completat:      superat,
      nodes_desbloquejats: nodesDesbloquejats,
      rang_nou:            nouRang   !== usuari.rang   ? nouRang   : null,
      nivell_nou:          nouNivell !== usuari.nivell ? nouNivell : null,
      nova_racha:          novaRacha,
      sr_resum: {
        dominades,
        pendents_dema,
        propera_revisio,
      },
      sr_preguntes: srPreguntes,
    });
  } catch (err) {
    console.error('Error finalitzant sessió:', err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── EXPLICAR (ampliada) ───────────────────────────────────────────────────────

async function explicar(req, res) {
  const { pregunta_text, opcions, resposta_correcta, node_id } = req.body;
  if (!pregunta_text || !resposta_correcta) {
    return res.status(400).json({ error: 'Falten pregunta_text i resposta_correcta' });
  }

  const node = NODES[node_id] || {};
  const materia = node_id ? node_id.split('-')[0] : '';

  // Null-safe: les opcions pot haver-hi valors no-string si vénen del format antic
  const opcionsTxt = Array.isArray(opcions)
    ? opcions.map((o, i) => {
        const t = typeof o === 'string' ? o.replace(/^[A-D]\.\s*/, '') : String(o || '');
        return `${['A','B','C','D'][i]}. ${t}`;
      }).join('\n')
    : '';

  const idiomaResposta = materia === 'castella'
    ? 'Responde en castellano. No repitas la pregunta.'
    : materia === 'angles'
    ? 'Explain in English. Do not repeat the question.'
    : 'Respon en català. No repeteixis la pregunta.';

  const prompt = `Ets un professor de PACFGM (proves d'accés a cicles formatius de grau mitjà de Catalunya).
L'alumne ha fallat aquesta pregunta:

${pregunta_text}
${opcionsTxt ? `\nOpcions:\n${opcionsTxt}` : ''}
Resposta correcta: ${resposta_correcta}

Explica en 3-4 frases clares per a un alumne ESO: per qué ${resposta_correcta} és correcta i un truc per recordar-ho.
${idiomaResposta}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

    const MODEL = 'gemini-2.0-flash';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response;
    try {
      response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Gemini ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const json = await response.json();
    const parts = json.candidates?.[0]?.content?.parts || [];
    const text = parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();

    if (!text) {
      const reason = json.candidates?.[0]?.finishReason || 'unknown';
      throw new Error(`Resposta buida de Gemini (finishReason: ${reason})`);
    }

    return res.json({ explicacio_ampliada: text });
  } catch (err) {
    console.error('[explicar]', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── ANALITZAR IMATGE DE DESENVOLUPAMENT (Gemini Vision) ──────────────────────
// Rep base64 de la imatge, analitza el desenvolupament de l'alumne,
// guarda el resultat com a text a preguntes_log i el retorna.

async function analitzarImatge(req, res) {
  const { sessio_id, pregunta_idx, base64, mime_type, pregunta_text, resposta_correcta, node_id } = req.body;

  if (!base64 || !mime_type) {
    return res.status(400).json({ error: 'Cal enviar base64 i mime_type de la imatge' });
  }
  // Limitar mida (base64 de ~4MB = 3MB de raw)
  if (base64.length > 5_500_000) {
    return res.status(413).json({ error: 'Imatge massa gran (màxim ~4MB)' });
  }

  try {
    const analisi = await analitzarDesenvolupament({
      base64,
      mimeType: mime_type,
      preguntaText: pregunta_text || '',
      respostaCorrecta: resposta_correcta || '',
      nodeId: node_id || '',
    });

    // Guardar el text al log si tenim sessio_id i índex
    if (sessio_id && pregunta_idx !== undefined) {
      const textGuardar = JSON.stringify(analisi);
      await pool.query(
        `UPDATE preguntes_log SET desenvolupament_text = ?
         WHERE sessio_id = ? ORDER BY id LIMIT 1 OFFSET ${parseInt(pregunta_idx, 10)}`,
        [textGuardar, sessio_id]
      ).catch(() => {}); // No és crític si falla
    }

    return res.json(analisi);
  } catch (err) {
    console.error('[analitzar-imatge]', err.message);
    return res.status(500).json({ error: 'Error analitzant la imatge' });
  }
}

module.exports = { generar, resposta, finalitzar, explicar, analitzarImatge };
