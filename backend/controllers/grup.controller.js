const pool = require('../db/connection');

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

async function progresGrup(req, res) {
  if (req.usuari.rol !== 'monitor') {
    return res.status(403).json({ error: 'Accés restringit al monitor' });
  }

  try {
    const [alumnes] = await pool.query(
      `SELECT u.id, u.alias, u.rang, u.nivell, u.xp_total, u.xp_setmana,
              u.racha_dies, u.ultima_sessio,
              COUNT(CASE WHEN pn.estat IN ('completat','dominat') THEN 1 END) AS nodes_completats,
              COUNT(pn.id) AS nodes_totals
       FROM usuaris u
       LEFT JOIN progres_nodes pn ON pn.usuari_id = u.id
       WHERE u.rol = 'alumne' AND u.actiu = TRUE
       GROUP BY u.id
       ORDER BY u.xp_setmana DESC`
    );

    // Find weakest subjects per student (lowest completion ratio)
    const result = await Promise.all(alumnes.map(async (a) => {
      const [stats] = await pool.query(
        `SELECT SUBSTRING_INDEX(node_id, '-', 1) AS materia,
                COUNT(*) AS total,
                SUM(CASE WHEN estat IN ('completat','dominat') THEN 1 ELSE 0 END) AS completats
         FROM progres_nodes WHERE usuari_id = ?
         GROUP BY materia`,
        [a.id]
      );

      const puntsFebles = stats
        .filter(m => m.total > 0)
        .sort((a, b) => (a.completats / a.total) - (b.completats / b.total))
        .slice(0, 3)
        .map(m => m.materia);

      return { ...a, punts_febles: puntsFebles };
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

module.exports = { leaderboard, progresGrup };
