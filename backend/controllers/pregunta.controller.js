const pool = require('../db/connection');
const { NODES } = require('../data/skillTree');
const { generarPregunta } = require('../services/gemini.service');
const { calcularNivell, calcularRang, calcularXpSessio } = require('../utils/xp');

async function generar(req, res) {
  const { node_id, idioma = 'catala' } = req.body;
  const usuariId = req.usuari.id;

  if (!node_id) return res.status(400).json({ error: 'Falta node_id' });

  const node = NODES[node_id];
  if (!node) return res.status(404).json({ error: 'Node no trobat' });

  try {
    // Check node is available for this user
    const [progesRows] = await pool.query(
      'SELECT estat FROM progres_nodes WHERE usuari_id = ? AND node_id = ?',
      [usuariId, node_id]
    );
    const estat = progesRows.length > 0 ? progesRows[0].estat : 'bloquejat';
    if (estat === 'bloquejat') {
      return res.status(403).json({ error: 'Node bloquejat. Completa el node anterior primer.' });
    }

    // Resume open session if < 5 questions answered
    const [openSessions] = await pool.query(
      `SELECT s.id, COUNT(p.id) AS respostes
       FROM sessions_estudi s
       LEFT JOIN preguntes_log p ON p.sessio_id = s.id
       WHERE s.usuari_id = ? AND s.node_id = ? AND s.completada = FALSE
       GROUP BY s.id
       ORDER BY s.creat_at DESC LIMIT 1`,
      [usuariId, node_id]
    );

    let sessioId, numeroPreg;

    if (openSessions.length > 0 && openSessions[0].respostes < 5) {
      sessioId  = openSessions[0].id;
      numeroPreg = openSessions[0].respostes + 1;
    } else {
      const [newSessio] = await pool.query(
        'INSERT INTO sessions_estudi (usuari_id, node_id) VALUES (?, ?)',
        [usuariId, node_id]
      );
      sessioId  = newSessio.insertId;
      numeroPreg = 1;
    }

    // Generate question via Gemini
    const question = await generarPregunta(node_id, node.temari, idioma);

    // Store question — pack opcions + explicacio together so we can retrieve at answer time
    await pool.query(
      `INSERT INTO preguntes_log
         (sessio_id, numero_pregunta, pregunta_text, opcions, resposta_correcta)
       VALUES (?, ?, ?, ?, ?)`,
      [
        sessioId,
        numeroPreg,
        question.pregunta,
        JSON.stringify({ opcions: question.opcions, explicacio: question.explicacio }),
        question.correcta,
      ]
    );

    return res.json({
      sessio_id:       sessioId,
      numero_pregunta: numeroPreg,
      total_preguntes: 5,
      pregunta:        question.pregunta,
      opcions:         question.opcions,
    });
  } catch (err) {
    console.error('Error generant pregunta:', err);
    const msg = err?.message || String(err);
    return res.status(500).json({ error: 'Error generant la pregunta', detall: msg });
  }
}

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

    // Get the latest unanswered question
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

    let explicacio = '';
    try {
      explicacio = JSON.parse(preg.opcions).explicacio || '';
    } catch { /* ignore */ }

    await pool.query(
      `UPDATE preguntes_log
       SET resposta_alumne = ?, correcte = ?, temps_resposta_ms = ?
       WHERE id = ?`,
      [respostaAlumne.toUpperCase(), esCorrecte, temps_ms, preg.id]
    );

    const [counts] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(resposta_alumne IS NOT NULL) AS respostes,
         SUM(correcte = TRUE) AS encerts
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
         COUNT(*) AS total,
         SUM(correcte = TRUE) AS encerts,
         SUM(COALESCE(temps_resposta_ms, 0)) AS total_ms
       FROM preguntes_log WHERE sessio_id = ?`,
      [sessio_id]
    );

    const encerts   = parseInt(resultats[0].encerts) || 0;
    const total     = parseInt(resultats[0].total)   || 5;
    const total_ms  = parseInt(resultats[0].total_ms) || 0;
    const puntuacio = Math.round((encerts / total) * 100);
    const superat   = puntuacio >= 60;
    const dominat   = puntuacio >= 90;

    const [usuaris] = await pool.query('SELECT * FROM usuaris WHERE id = ?', [usuariId]);
    const usuari = usuaris[0];

    // Update streak
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

    // Close session
    await pool.query(
      `UPDATE sessions_estudi
       SET completada = TRUE, superat = ?, puntuacio = ?,
           preguntes_correctes = ?, xp_guanyat = ?,
           durada_segons = TIMESTAMPDIFF(SECOND, creat_at, NOW())
       WHERE id = ?`,
      [superat, puntuacio, encerts, xp_guanyat, sessio_id]
    );

    // Update user
    await pool.query(
      `UPDATE usuaris
       SET xp_total = ?, xp_setmana = ?, nivell = ?, rang = ?,
           racha_dies = ?, ultima_sessio = ?
       WHERE id = ?`,
      [nou_xp_total, nou_xp_setmana, nouNivell, nouRang, novaRacha, avui, usuariId]
    );

    // XP audit log
    await pool.query(
      'INSERT INTO xp_log (usuari_id, xp_delta, motiu, referencia) VALUES (?, ?, ?, ?)',
      [usuariId, xp_guanyat, 'sessio_completada', sessio_id]
    );

    // ── INTERVALS DE REPETICIÓ ESPACIADA ─────────────────
    const SR_INTERVALS = [3, 7, 14, 30, 90]; // dies

    // Update node progress + unlock children
    let nodesDesbloquejats = [];
    let proximaRevisio = null;
    let srMissatge = null;

    if (superat) {
      // Comprovar si ja existeix una revisió programada per aquest node
      const [srRows] = await pool.query(
        'SELECT * FROM revisio_programada WHERE usuari_id = ? AND node_id = ?',
        [usuariId, sessio.node_id]
      );

      let nouEstat = 'completat';

      if (srRows.length === 0) {
        // Primera vegada que supera el node → programar revisió a +3 dies
        const dataRevisio = new Date();
        dataRevisio.setDate(dataRevisio.getDate() + SR_INTERVALS[0]);
        const dataStr = dataRevisio.toISOString().split('T')[0];

        await pool.query(
          `INSERT INTO revisio_programada (usuari_id, node_id, propera_revisio, interval_dies, num_revisions)
           VALUES (?, ?, ?, ?, 0)`,
          [usuariId, sessio.node_id, dataStr, SR_INTERVALS[0]]
        );
        proximaRevisio = dataStr;
        srMissatge = `Node après! Repàs programat d'aquí ${SR_INTERVALS[0]} dies.`;

        // Desbloquejar fills
        for (const fillId of (node?.fills || [])) {
          const [existing] = await pool.query(
            'SELECT estat FROM progres_nodes WHERE usuari_id = ? AND node_id = ?',
            [usuariId, fillId]
          );
          if (existing.length === 0) {
            await pool.query(
              'INSERT INTO progres_nodes (usuari_id, node_id, estat) VALUES (?, ?, ?)',
              [usuariId, fillId, 'disponible']
            );
            nodesDesbloquejats.push(fillId);
          } else if (existing[0].estat === 'bloquejat') {
            await pool.query(
              'UPDATE progres_nodes SET estat = ? WHERE usuari_id = ? AND node_id = ?',
              ['disponible', usuariId, fillId]
            );
            nodesDesbloquejats.push(fillId);
          }
        }
      } else {
        // Revisió d'un node ja après — actualitzar interval SR
        const sr = srRows[0];
        const numRevisions = sr.num_revisions + 1;
        let nouInterval = sr.interval_dies;
        let nouSrMissatge = '';

        if (puntuacio >= 75) {
          // Bon rendiment → avançar interval
          const indexActual = SR_INTERVALS.indexOf(sr.interval_dies);
          const indexSeguent = Math.min(indexActual + 1, SR_INTERVALS.length - 1);
          nouInterval = SR_INTERVALS[indexSeguent];

          if (indexSeguent >= SR_INTERVALS.length - 1 && puntuacio >= 75) {
            // Ha completat tots els intervals → dominat!
            nouEstat = 'dominat';
            nouSrMissatge = 'Has dominat aquest tema completament!';
          } else {
            nouSrMissatge = `Excel·lent! Proper repàs d'aquí ${nouInterval} dies.`;
          }
        } else if (puntuacio >= 55) {
          // Rendiment acceptable → mantenir interval
          nouSrMissatge = `Bé! Repetim d'aquí ${nouInterval} dies per consolidar.`;
        } else {
          // Mal rendiment → tornar a l'inici del cicle
          nouInterval = SR_INTERVALS[0];
          nouSrMissatge = `Necessites més pràctica. Repàs d'aquí ${nouInterval} dies.`;
        }

        const dataRevisio = new Date();
        dataRevisio.setDate(dataRevisio.getDate() + nouInterval);
        const dataStr = dataRevisio.toISOString().split('T')[0];

        await pool.query(
          `UPDATE revisio_programada
           SET propera_revisio = ?, interval_dies = ?, num_revisions = ?
           WHERE usuari_id = ? AND node_id = ?`,
          [dataStr, nouInterval, numRevisions, usuariId, sessio.node_id]
        );
        proximaRevisio = dataStr;
        srMissatge = nouSrMissatge;
      }

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

    } else {
      await pool.query(
        `INSERT INTO progres_nodes (usuari_id, node_id, estat, intents)
         VALUES (?, ?, 'disponible', 1)
         ON DUPLICATE KEY UPDATE intents = intents + 1`,
        [usuariId, sessio.node_id]
      );
    }

    return res.json({
      puntuacio,
      superat,
      xp_guanyat,
      node_completat:      superat,
      nodes_desbloquejats: nodesDesbloquejats,
      rang_nou:            nouRang !== usuari.rang    ? nouRang   : null,
      nivell_nou:          nouNivell !== usuari.nivell ? nouNivell : null,
      nova_racha:          novaRacha,
      propera_revisio:     proximaRevisio,
      sr_missatge:         srMissatge,
    });
  } catch (err) {
    console.error('Error finalitzant sessió:', err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

module.exports = { generar, resposta, finalitzar };
