const pool = require('../db/connection');
const { generarInforme } = require('../services/gemini.service');

function soloPare(req, res, next) {
  if (req.usuari.rol !== 'monitor' || req.usuari.subtipus !== 'pare') {
    return res.status(403).json({ error: 'Accés restringit a pares/mares' });
  }
  next();
}

// ── VINCULAR FILL (envia sol·licitud pendent) ─────────────────────────────────

async function vincularFill(req, res) {
  const pareId = req.usuari.id;
  const { alias } = req.body;
  if (!alias?.trim()) return res.status(400).json({ error: 'Cal indicar l\'àlies del fill/a' });

  try {
    const [rows] = await pool.query(
      "SELECT id, nom, alias FROM usuaris WHERE alias = ? AND rol = 'alumne' AND actiu = TRUE",
      [alias.trim()]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No s\'ha trobat cap alumne amb aquest àlies' });

    const fill = rows[0];

    const [[existent]] = await pool.query(
      'SELECT estat FROM familia WHERE pare_id = ? AND fill_id = ?',
      [pareId, fill.id]
    );
    if (existent?.estat === 'actiu') {
      return res.status(409).json({ error: 'Aquest fill/a ja està vinculat al teu compte' });
    }
    if (existent?.estat === 'pendent') {
      return res.status(409).json({ error: 'Ja has enviat una sol·licitud a aquest fill/a. Espera que l\'accepti.' });
    }

    await pool.query(
      'INSERT INTO familia (pare_id, fill_id, estat) VALUES (?, ?, ?)',
      [pareId, fill.id, 'pendent']
    );

    return res.json({ ok: true, pendent: true, fill: { id: fill.id, nom: fill.nom, alias: fill.alias } });
  } catch (err) {
    console.error('[familia] vincular:', err.message);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── CANCEL·LAR SOL·LICITUD PENDENT (pare) ────────────────────────────────────

async function cancellarPeticio(req, res) {
  const pareId = req.usuari.id;
  const fillId = parseInt(req.params.fill_id, 10);
  if (!fillId) return res.status(400).json({ error: 'ID invàlid' });

  try {
    await pool.query(
      "DELETE FROM familia WHERE pare_id = ? AND fill_id = ? AND estat = 'pendent'",
      [pareId, fillId]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[familia] cancellar:', err.message);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── DESVINCULAR FILL ACTIU ────────────────────────────────────────────────────

async function desvincularFill(req, res) {
  const pareId = req.usuari.id;
  const fillId = parseInt(req.params.fill_id, 10);
  if (!fillId) return res.status(400).json({ error: 'ID invàlid' });

  try {
    await pool.query('DELETE FROM familia WHERE pare_id = ? AND fill_id = ?', [pareId, fillId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[familia] desvincular:', err.message);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── LLISTA DE FILLS ACTIUS + PETICIONS ENVIADES (pare) ───────────────────────

async function getFills(req, res) {
  const pareId = req.usuari.id;
  try {
    const [fills] = await pool.query(
      `SELECT u.id, u.alias, u.nom, u.rang, u.nivell, u.xp_total, u.xp_setmana,
              u.racha_dies, u.ultima_sessio
       FROM familia f
       JOIN usuaris u ON u.id = f.fill_id
       WHERE f.pare_id = ? AND f.estat = 'actiu' AND u.actiu = TRUE
       ORDER BY f.creat_at ASC`,
      [pareId]
    );

    const [pendents] = await pool.query(
      `SELECT u.id, u.alias, u.nom, f.creat_at
       FROM familia f
       JOIN usuaris u ON u.id = f.fill_id
       WHERE f.pare_id = ? AND f.estat = 'pendent'
       ORDER BY f.creat_at ASC`,
      [pareId]
    );

    if (fills.length === 0) return res.json({ fills: [], pendents });

    const fillIds = fills.map(f => f.id);
    const [nodes] = await pool.query(
      `SELECT usuari_id, estat FROM progres_nodes WHERE usuari_id IN (?)`, [fillIds]
    );

    const progresMap = {};
    for (const n of nodes) {
      if (!progresMap[n.usuari_id]) progresMap[n.usuari_id] = { total: 0, completats: 0, dominats: 0 };
      progresMap[n.usuari_id].total++;
      if (n.estat === 'completat' || n.estat === 'dominat') progresMap[n.usuari_id].completats++;
      if (n.estat === 'dominat') progresMap[n.usuari_id].dominats++;
    }

    const [matRows] = await pool.query(
      `SELECT usuari_id, SUBSTRING_INDEX(node_id, '-', 1) AS materia,
              SUM(CASE WHEN estat IN ('completat','dominat') THEN 1 ELSE 0 END) AS completats,
              COUNT(*) AS total
       FROM progres_nodes WHERE usuari_id IN (?)
       GROUP BY usuari_id, materia`,
      [fillIds]
    );

    const puntsFebles = {};
    for (const r of matRows) {
      if (!puntsFebles[r.usuari_id]) puntsFebles[r.usuari_id] = [];
      const pct = r.total > 0 ? Math.round((r.completats / r.total) * 100) : 0;
      if (pct < 40) puntsFebles[r.usuari_id].push(r.materia);
    }

    const result = fills.map(f => ({
      ...f,
      nodes_completats: progresMap[f.id]?.completats || 0,
      nodes_dominats:   progresMap[f.id]?.dominats   || 0,
      nodes_totals:     progresMap[f.id]?.total       || 0,
      punts_febles:     puntsFebles[f.id]             || [],
    }));

    return res.json({ fills: result, pendents });
  } catch (err) {
    console.error('[familia] getFills:', err.message);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── SOL·LICITUDS REBUDES (alumne) ─────────────────────────────────────────────

async function getPeticionsRebudes(req, res) {
  const fillId = req.usuari.id;
  try {
    const [peticions] = await pool.query(
      `SELECT u.id AS pare_id, u.alias, u.nom, u.subtipus, f.creat_at
       FROM familia f
       JOIN usuaris u ON u.id = f.pare_id
       WHERE f.fill_id = ? AND f.estat = 'pendent'
       ORDER BY f.creat_at DESC`,
      [fillId]
    );
    return res.json(peticions);
  } catch (err) {
    console.error('[familia] peticions rebudes:', err.message);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── ACCEPTAR SOL·LICITUD (alumne) ────────────────────────────────────────────

async function acceptarPeticio(req, res) {
  const fillId = req.usuari.id;
  const pareId = parseInt(req.params.pare_id, 10);
  if (!pareId) return res.status(400).json({ error: 'ID invàlid' });

  try {
    const [result] = await pool.query(
      "UPDATE familia SET estat = 'actiu' WHERE pare_id = ? AND fill_id = ? AND estat = 'pendent'",
      [pareId, fillId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Sol·licitud no trobada' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[familia] acceptar:', err.message);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── REBUTJAR SOL·LICITUD (alumne) ────────────────────────────────────────────

async function rebutjarPeticio(req, res) {
  const fillId = req.usuari.id;
  const pareId = parseInt(req.params.pare_id, 10);
  if (!pareId) return res.status(400).json({ error: 'ID invàlid' });

  try {
    await pool.query(
      "DELETE FROM familia WHERE pare_id = ? AND fill_id = ? AND estat = 'pendent'",
      [pareId, fillId]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[familia] rebutjar:', err.message);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── INFORME IA D'UN FILL ──────────────────────────────────────────────────────

async function informeFill(req, res) {
  const pareId = req.usuari.id;
  const fillId = parseInt(req.params.fill_id, 10);
  if (!fillId) return res.status(400).json({ error: 'ID invàlid' });

  try {
    const [check] = await pool.query(
      "SELECT id FROM familia WHERE pare_id = ? AND fill_id = ? AND estat = 'actiu'",
      [pareId, fillId]
    );
    if (check.length === 0) return res.status(403).json({ error: 'Aquest fill no està vinculat al teu compte' });

    const [[alumne]] = await pool.query(
      'SELECT alias, rang, nivell, xp_total, racha_dies, ultima_sessio FROM usuaris WHERE id = ?',
      [fillId]
    );
    if (!alumne) return res.status(404).json({ error: 'Alumne no trobat' });

    const [[{ numSessions30d }]] = await pool.query(
      'SELECT COUNT(*) AS numSessions30d FROM sessions_estudi WHERE usuari_id = ? AND creat_at > DATE_SUB(NOW(), INTERVAL 30 DAY)',
      [fillId]
    );

    const [progresMat] = await pool.query(
      `SELECT SUBSTRING_INDEX(node_id, '-', 1) AS materia,
              COUNT(*) AS total_nodes,
              SUM(CASE WHEN estat IN ('completat','dominat') THEN 1 ELSE 0 END) AS completats,
              SUM(CASE WHEN estat = 'dominat' THEN 1 ELSE 0 END) AS dominats,
              AVG(CASE WHEN estat IN ('completat','dominat') THEN millor_puntuacio ELSE NULL END) AS puntuacio_mitja
       FROM progres_nodes WHERE usuari_id = ? GROUP BY materia`,
      [fillId]
    );

    const avui = new Date().toISOString().split('T')[0];
    const [srRows] = await pool.query(
      `SELECT SUBSTRING_INDEX(pb.node_id, '-', 1) AS materia,
              COUNT(*) AS total,
              SUM(CASE WHEN sp.propera_revisio > ? THEN 1 ELSE 0 END) AS fresques
       FROM sr_pregunta sp
       JOIN preguntes_bank pb ON pb.id = sp.pregunta_id
       WHERE sp.usuari_id = ?
       GROUP BY materia`,
      [avui, fillId]
    );
    const retencio = {};
    for (const r of srRows) {
      const pct = r.total > 0 ? Math.round((r.fresques / r.total) * 100) : 0;
      retencio[r.materia] = { total: r.total, fresques: r.fresques, pct };
    }

    const informe = await generarInforme({ alumne, progresMat, retencio, numSessions30d });
    return res.json({ alumne, informe, generat_at: new Date().toISOString() });
  } catch (err) {
    console.error('[familia] informe:', err.message);
    return res.status(500).json({ error: 'Error generant l\'informe' });
  }
}

module.exports = {
  soloPare, vincularFill, cancellarPeticio, desvincularFill,
  getFills, getPeticionsRebudes, acceptarPeticio, rebutjarPeticio, informeFill,
};
