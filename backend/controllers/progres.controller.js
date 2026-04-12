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
    const [rows] = await pool.query(
      `SELECT r.node_id, r.propera_revisio, r.interval_dies, r.num_revisions,
              p.millor_puntuacio, n.titol, n.materia
       FROM revisio_programada r
       JOIN progres_nodes p ON p.usuari_id = r.usuari_id AND p.node_id = r.node_id
       WHERE r.usuari_id = ? AND r.propera_revisio <= ?
       ORDER BY r.propera_revisio ASC`,
      [usuariId, avui]
    );

    // Afegir info de títol des del skill tree
    const result = rows.map(r => ({
      node_id:          r.node_id,
      titol:            NODES[r.node_id]?.titol || r.node_id,
      materia:          r.materia,
      propera_revisio:  r.propera_revisio,
      interval_dies:    r.interval_dies,
      num_revisions:    r.num_revisions,
      millor_puntuacio: r.millor_puntuacio,
    }));

    return res.json({ revisions: result, total: result.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

module.exports = { meu, skillTree, revisionsAvui };
