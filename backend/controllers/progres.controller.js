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

module.exports = { meu, skillTree };
