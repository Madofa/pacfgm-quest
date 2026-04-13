const pool = require('../db/connection');
const { generarInforme } = require('../services/gemini.service');

// Genera un codi únic de 6 caràcters alfanumèrics majúscules
function generarCodi() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sense 0/O/1/I per evitar confusions
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function codiUnic() {
  for (let intent = 0; intent < 10; intent++) {
    const codi = generarCodi();
    const [rows] = await pool.query('SELECT id FROM grups WHERE codi = ?', [codi]);
    if (rows.length === 0) return codi;
  }
  throw new Error('No s\'ha pogut generar un codi únic');
}

// ── CREAR GRUP ────────────────────────────────────────────────────────────────

async function crearGrup(req, res) {
  if (req.usuari.rol !== 'monitor') {
    return res.status(403).json({ error: 'Només els monitors poden crear grups' });
  }
  const { nom } = req.body;
  if (!nom || nom.trim().length < 2) {
    return res.status(400).json({ error: 'Cal indicar un nom per al grup (mínim 2 caràcters)' });
  }

  try {
    const codi = await codiUnic();
    const [ins] = await pool.query(
      'INSERT INTO grups (nom, codi, creat_per) VALUES (?, ?, ?)',
      [nom.trim(), codi, req.usuari.id]
    );
    await pool.query(
      "INSERT INTO grups_membres (grup_id, usuari_id, rol_grup) VALUES (?, ?, 'monitor')",
      [ins.insertId, req.usuari.id]
    );
    return res.status(201).json({ grup: { id: ins.insertId, nom: nom.trim(), codi } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── UNIR-SE A UN GRUP (monitor o alumne) ──────────────────────────────────────

async function unirGrup(req, res) {
  const { codi } = req.body;
  if (!codi) return res.status(400).json({ error: 'Cal indicar el codi del grup' });

  try {
    const [grups] = await pool.query('SELECT * FROM grups WHERE codi = ?', [codi.trim().toUpperCase()]);
    if (grups.length === 0) return res.status(404).json({ error: 'Codi de grup incorrecte' });

    const grup = grups[0];
    const rolGrup = req.usuari.rol === 'monitor' ? 'monitor' : 'alumne';

    // Comprovar si ja és membre
    const [existing] = await pool.query(
      'SELECT * FROM grups_membres WHERE grup_id = ? AND usuari_id = ?',
      [grup.id, req.usuari.id]
    );
    if (existing.length > 0) {
      return res.json({ ok: true, grup: { id: grup.id, nom: grup.nom, codi: grup.codi }, ja_membre: true });
    }

    // Si és alumne i ja pertany a un altre grup, sortir d'aquell primer
    if (rolGrup === 'alumne') {
      await pool.query(
        "DELETE FROM grups_membres WHERE usuari_id = ? AND rol_grup = 'alumne'",
        [req.usuari.id]
      );
    }

    await pool.query(
      'INSERT INTO grups_membres (grup_id, usuari_id, rol_grup) VALUES (?, ?, ?)',
      [grup.id, req.usuari.id, rolGrup]
    );

    return res.json({ ok: true, grup: { id: grup.id, nom: grup.nom, codi: grup.codi } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── ELS MEUS GRUPS ────────────────────────────────────────────────────────────

async function elsMemsGrups(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT g.id, g.nom, g.codi,
              COUNT(DISTINCT CASE WHEN gm2.rol_grup = 'alumne'  THEN gm2.usuari_id END) AS num_alumnes,
              COUNT(DISTINCT CASE WHEN gm2.rol_grup = 'monitor' THEN gm2.usuari_id END) AS num_monitors
       FROM grups g
       JOIN grups_membres gm  ON gm.grup_id  = g.id AND gm.usuari_id = ?
       LEFT JOIN grups_membres gm2 ON gm2.grup_id = g.id
       GROUP BY g.id`,
      [req.usuari.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── LEADERBOARD ───────────────────────────────────────────────────────────────

async function leaderboard(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT alias, rang, xp_setmana, racha_dies,
              RANK() OVER (ORDER BY xp_setmana DESC) AS posicio
       FROM usuaris
       WHERE actiu = TRUE
       ORDER BY xp_setmana DESC
       LIMIT 50`
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── PROGRÉS DEL GRUP (monitor) ────────────────────────────────────────────────

async function progresGrup(req, res) {
  if (req.usuari.rol !== 'monitor') {
    return res.status(403).json({ error: 'Accés restringit al monitor' });
  }

  try {
    // Alumnes dels grups on és monitor
    const [alumnes] = await pool.query(
      `SELECT u.id, u.alias, u.rang, u.nivell, u.xp_total, u.xp_setmana,
              u.racha_dies, u.ultima_sessio,
              COUNT(CASE WHEN pn.estat IN ('completat','dominat') THEN 1 END) AS nodes_completats,
              COUNT(pn.id) AS nodes_totals
       FROM grups_membres gm_monitor
       JOIN grups g ON g.id = gm_monitor.grup_id
       JOIN grups_membres gm_alumne ON gm_alumne.grup_id = g.id AND gm_alumne.rol_grup = 'alumne'
       JOIN usuaris u ON u.id = gm_alumne.usuari_id
       LEFT JOIN progres_nodes pn ON pn.usuari_id = u.id
       WHERE gm_monitor.usuari_id = ? AND gm_monitor.rol_grup = 'monitor'
         AND u.actiu = TRUE
       GROUP BY u.id
       ORDER BY u.xp_setmana DESC`,
      [req.usuari.id]
    );

    const result = await Promise.all(alumnes.map(async (a) => {
      const [stats] = await pool.query(
        `SELECT SUBSTRING_INDEX(node_id, '-', 1) AS materia,
                COUNT(*) AS total,
                SUM(CASE WHEN estat IN ('completat','dominat') THEN 1 ELSE 0 END) AS completats
         FROM progres_nodes WHERE usuari_id = ? GROUP BY materia`,
        [a.id]
      );
      const puntsFebles = stats
        .filter(m => m.total > 0)
        .sort((a, b) => (a.completats / a.total) - (b.completats / b.total))
        .slice(0, 3).map(m => m.materia);
      return { ...a, punts_febles: puntsFebles };
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// ── INFORME IA D'UN ALUMNE (per a tutor/pare) ─────────────────────────────────

async function informeAlumne(req, res) {
  if (req.usuari.rol !== 'monitor') {
    return res.status(403).json({ error: 'Accés restringit al tutor/monitor' });
  }

  const alumneId = parseInt(req.params.alumne_id, 10);
  if (!alumneId) return res.status(400).json({ error: 'ID d\'alumne invàlid' });

  try {
    // Verificar que l'alumne pertany a un grup del monitor
    const [check] = await pool.query(
      `SELECT u.id FROM usuaris u
       JOIN grups_membres gm_a ON gm_a.usuari_id = u.id AND gm_a.rol_grup = 'alumne'
       JOIN grups_membres gm_m ON gm_m.grup_id = gm_a.grup_id AND gm_m.usuari_id = ? AND gm_m.rol_grup = 'monitor'
       WHERE u.id = ? LIMIT 1`,
      [req.usuari.id, alumneId]
    );
    if (check.length === 0) return res.status(403).json({ error: 'Alumne no pertany al teu grup' });

    // Dades bàsiques de l'alumne
    const [[alumne]] = await pool.query(
      'SELECT alias, rang, nivell, xp_total, racha_dies, ultima_sessio FROM usuaris WHERE id = ?',
      [alumneId]
    );
    if (!alumne) return res.status(404).json({ error: 'Alumne no trobat' });

    // Sessions últims 30 dies
    const [[{ numSessions30d }]] = await pool.query(
      'SELECT COUNT(*) AS numSessions30d FROM sessions_estudi WHERE usuari_id = ? AND creat_at > DATE_SUB(NOW(), INTERVAL 30 DAY)',
      [alumneId]
    );

    // Progrés per matèria
    const [progresMat] = await pool.query(
      `SELECT SUBSTRING_INDEX(node_id, '-', 1) AS materia,
              COUNT(*) AS total_nodes,
              SUM(CASE WHEN estat IN ('completat','dominat') THEN 1 ELSE 0 END) AS completats,
              SUM(CASE WHEN estat = 'dominat' THEN 1 ELSE 0 END) AS dominats,
              AVG(CASE WHEN estat IN ('completat','dominat') THEN millor_puntuacio ELSE NULL END) AS puntuacio_mitja
       FROM progres_nodes WHERE usuari_id = ? GROUP BY materia`,
      [alumneId]
    );

    // Retencio SR per matèria
    const avui = new Date().toISOString().split('T')[0];
    const [srRows] = await pool.query(
      `SELECT SUBSTRING_INDEX(pb.node_id, '-', 1) AS materia,
              COUNT(*) AS total,
              SUM(CASE WHEN sp.propera_revisio > ? THEN 1 ELSE 0 END) AS fresques
       FROM sr_pregunta sp
       JOIN preguntes_bank pb ON pb.id = sp.pregunta_id
       WHERE sp.usuari_id = ?
       GROUP BY materia`,
      [avui, alumneId]
    );
    const retencio = {};
    for (const r of srRows) {
      const pct = r.total > 0 ? Math.round((r.fresques / r.total) * 100) : 0;
      retencio[r.materia] = { total: r.total, fresques: r.fresques, pct };
    }

    // Generar informe amb Gemini
    const informe = await generarInforme({ alumne, progresMat, retencio, numSessions30d });

    return res.json({ alumne, informe, generat_at: new Date().toISOString() });
  } catch (err) {
    console.error('[informe]', err);
    return res.status(500).json({ error: 'Error generant l\'informe' });
  }
}

module.exports = { leaderboard, progresGrup, crearGrup, unirGrup, elsMemsGrups, informeAlumne };
