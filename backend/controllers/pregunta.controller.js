const pool = require('../db/connection');
const { NODES } = require('../data/skillTree');
const { generarPregunta } = require('../services/gemini.service');
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

// ── GENERAR ───────────────────────────────────────────────────────────────────

async function generar(req, res) {
  const { node_id, idioma = 'catala' } = req.body;
  const usuariId = req.usuari.id;

  if (!node_id) return res.status(400).json({ error: 'Falta node_id' });
  const node = NODES[node_id];
  if (!node) return res.status(404).json({ error: 'Node no trobat' });

  try {
    // Verificar que el node és accessible
    const [progresRows] = await pool.query(
      'SELECT estat FROM progres_nodes WHERE usuari_id = ? AND node_id = ?',
      [usuariId, node_id]
    );
    const estat = progresRows.length > 0 ? progresRows[0].estat : 'bloquejat';
    if (estat === 'bloquejat') {
      return res.status(403).json({ error: 'Node bloquejat. Completa el node anterior primer.' });
    }

    // Comprovar si hi ha sessió oberta amb preguntes pendents
    const [openSessions] = await pool.query(
      `SELECT s.id,
              COUNT(p.id)                                    AS total_preguntes,
              SUM(p.resposta_alumne IS NOT NULL)             AS respostes
       FROM sessions_estudi s
       LEFT JOIN preguntes_log p ON p.sessio_id = s.id
       WHERE s.usuari_id = ? AND s.node_id = ? AND s.completada = FALSE
       GROUP BY s.id
       ORDER BY s.creat_at DESC LIMIT 1`,
      [usuariId, node_id]
    );

    let sessioId;

    if (openSessions.length > 0 && parseInt(openSessions[0].total_preguntes) >= 5
        && parseInt(openSessions[0].respostes) < 5) {
      // Reprendre sessió existent — preguntes ja carregades
      sessioId = openSessions[0].id;
    } else {
      // Nova sessió — construir el conjunt de 5 preguntes
      const [newSessio] = await pool.query(
        'INSERT INTO sessions_estudi (usuari_id, node_id) VALUES (?, ?)',
        [usuariId, node_id]
      );
      sessioId = newSessio.insertId;

      // 1. Preguntes de repàs pendents per a aquest node i usuari
      const avui = new Date().toISOString().split('T')[0];
      const [dueRows] = await pool.query(
        `SELECT pb.id, pb.pregunta_text, pb.opcions, pb.resposta_correcta, pb.explicacio
         FROM sr_pregunta sr
         JOIN preguntes_bank pb ON pb.id = sr.pregunta_id
         WHERE sr.usuari_id = ? AND pb.node_id = ? AND sr.propera_revisio <= ?
         ORDER BY sr.propera_revisio ASC, sr.consecutives_correctes ASC
         LIMIT 5`,
        [usuariId, node_id, avui]
      );

      // 2. Generar preguntes noves per als llocs restants
      const newCount = 5 - dueRows.length;
      const textsUsats = dueRows.map(q => q.pregunta_text);
      const newBankRows = [];

      for (let i = 0; i < newCount; i++) {
        try {
          const q = await generarPregunta(
            node_id, node.temari, idioma,
            [...textsUsats, ...newBankRows.map(r => r.pregunta_text)]
          );
          const [ins] = await pool.query(
            `INSERT INTO preguntes_bank (node_id, pregunta_text, opcions, resposta_correcta, explicacio)
             VALUES (?, ?, ?, ?, ?)`,
            [node_id, q.pregunta, JSON.stringify(q.opcions), q.correcta, q.explicacio]
          );
          newBankRows.push({
            id:                ins.insertId,
            pregunta_text:     q.pregunta,
            opcions:           JSON.stringify(q.opcions),
            resposta_correcta: q.correcta,
            explicacio:        q.explicacio,
          });
          textsUsats.push(q.pregunta);
        } catch (geminiErr) {
          // Gemini ha fallat — usar pregunta aleatòria del banc si n'hi ha
          console.warn(`[generar] Gemini error (slot ${i+1}): ${geminiErr.message}`);
          const usedIds = [...dueRows.map(q => q.id), ...newBankRows.map(q => q.id)];
          const placeholders = usedIds.length > 0 ? `AND id NOT IN (${usedIds.map(() => '?').join(',')})` : '';
          const [bankFallback] = await pool.query(
            `SELECT * FROM preguntes_bank WHERE node_id = ? ${placeholders} ORDER BY RAND() LIMIT 1`,
            [node_id, ...usedIds]
          );
          if (bankFallback.length > 0) {
            newBankRows.push(bankFallback[0]);
            textsUsats.push(bankFallback[0].pregunta_text);
          }
        }
      }

      // 3. Combinar: repàs primer, noves al final
      const allQ = [...dueRows, ...newBankRows];

      // 4. Pre-popular preguntes_log amb totes les preguntes de la sessió
      for (let i = 0; i < allQ.length; i++) {
        const q = allQ[i];
        const opcions = typeof q.opcions === 'string' ? q.opcions : JSON.stringify(q.opcions);
        await pool.query(
          `INSERT INTO preguntes_log
             (sessio_id, numero_pregunta, pregunta_bank_id, pregunta_text, opcions,
              resposta_correcta, explicacio)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [sessioId, i + 1, q.id, q.pregunta_text, opcions, q.resposta_correcta, q.explicacio]
        );
      }
    }

    // Retornar la pròxima pregunta sense respondre
    const [pending] = await pool.query(
      `SELECT * FROM preguntes_log
       WHERE sessio_id = ? AND resposta_alumne IS NULL
       ORDER BY numero_pregunta ASC LIMIT 1`,
      [sessioId]
    );

    if (!pending.length) {
      return res.status(409).json({ error: 'No hi ha preguntes pendents. Crida /finalitzar.' });
    }

    const preg = pending[0];

    return res.json({
      sessio_id:       sessioId,
      numero_pregunta: preg.numero_pregunta,
      total_preguntes: 5,
      pregunta:        preg.pregunta_text,
      opcions:         parseOpcions(preg.opcions),
    });
  } catch (err) {
    console.error('Error generant pregunta:', err);
    return res.status(500).json({ error: 'Error generant la pregunta', detall: err?.message || String(err) });
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

    // Resum SR de la sessió: quantes preguntes queden pendents per a demà
    const [srResum] = await pool.query(
      `SELECT
         SUM(sr.consecutives_correctes >= 4) AS dominades,
         SUM(sr.consecutives_correctes  = 0)  AS pendents_dema,
         MIN(sr.propera_revisio)              AS propera_revisio
       FROM preguntes_log pl
       JOIN sr_pregunta sr ON sr.pregunta_id = pl.pregunta_bank_id AND sr.usuari_id = ?
       WHERE pl.sessio_id = ?`,
      [usuariId, sessio_id]
    );

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
        dominades:      parseInt(srResum[0]?.dominades)     || 0,
        pendents_dema:  parseInt(srResum[0]?.pendents_dema) || 0,
        propera_revisio: srResum[0]?.propera_revisio || null,
      },
    });
  } catch (err) {
    console.error('Error finalitzant sessió:', err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

module.exports = { generar, resposta, finalitzar };
