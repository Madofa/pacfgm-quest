const pool = require('../db/connection');
const { NODES } = require('../data/skillTree');

async function meu(req, res) {
  const usuariId = req.usuari.id;

  try {
    const [usuaris] = await pool.query(
      `SELECT xp_total, xp_setmana, nivell, rang, racha_dies, ultima_sessio
       FROM usuaris WHERE id = ?`,
      [usuariId]
    );
    if (usuaris.length === 0) return res.status(404).json({ error: 'Usuari no trobat' });

    const [nodes] = await pool.query(
      `SELECT node_id, estat, millor_puntuacio, intents, xp_acumulat
       FROM progres_nodes WHERE usuari_id = ?`,
      [usuariId]
    );

    return res.json({ ...usuaris[0], nodes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

async function skillTree(req, res) {
  const usuariId = req.usuari.id;

  try {
    const [progesRows] = await pool.query(
      'SELECT node_id, estat, millor_puntuacio, intents FROM progres_nodes WHERE usuari_id = ?',
      [usuariId]
    );

    const progesMap = {};
    for (const row of progesRows) progesMap[row.node_id] = row;

    const result = Object.values(NODES).map(node => ({
      node_id:          node.id,
      titol:            node.titol,
      materia:          node.materia,
      pare:             node.pare,
      fills:            node.fills,
      estat:            progesMap[node.id]?.estat || 'bloquejat',
      millor_puntuacio: progesMap[node.id]?.millor_puntuacio || 0,
      intents:          progesMap[node.id]?.intents || 0,
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

async function revisionsAvui(req, res) {
  const usuariId = req.usuari.id;
  try {
    const avui = new Date().toISOString().split('T')[0];

    // Nodes que tenen preguntes individuals pendents de repàs avui
    const [rows] = await pool.query(
      `SELECT pb.node_id,
              COUNT(*)                     AS preguntes_pendents,
              MIN(sr.propera_revisio)      AS propera_revisio,
              AVG(sr.consecutives_correctes) AS mitja_consolidacio
       FROM sr_pregunta sr
       JOIN preguntes_bank pb ON pb.id = sr.pregunta_id
       WHERE sr.usuari_id = ? AND sr.propera_revisio <= ?
       GROUP BY pb.node_id
       ORDER BY propera_revisio ASC`,
      [usuariId, avui]
    );

    const result = rows.map(r => ({
      node_id:             r.node_id,
      titol:               NODES[r.node_id]?.titol || r.node_id,
      materia:             NODES[r.node_id]?.materia || '',
      preguntes_pendents:  parseInt(r.preguntes_pendents),
      propera_revisio:     r.propera_revisio,
    }));

    return res.json({ revisions: result, total: result.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

module.exports = { meu, skillTree, revisionsAvui };
