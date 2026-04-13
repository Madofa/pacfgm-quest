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

async function srDots(req, res) {
  const usuariId = req.usuari.id;
  try {
    // Per cada node: llista de consecutives_correctes de les preguntes vistes
    const [rows] = await pool.query(
      `SELECT pb.node_id, sr.consecutives_correctes
       FROM sr_pregunta sr
       JOIN preguntes_bank pb ON pb.id = sr.pregunta_id
       WHERE sr.usuari_id = ?`,
      [usuariId]
    );

    // Agrupar per node
    const dots = {};
    for (const row of rows) {
      if (!dots[row.node_id]) dots[row.node_id] = [];
      dots[row.node_id].push(Math.min(row.consecutives_correctes, 4));
    }

    return res.json(dots);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

async function errorsRecents(req, res) {
  const usuariId = req.usuari.id;
  try {
    const [rows] = await pool.query(
      `SELECT
         pl.id,
         pl.pregunta_text,
         pl.opcions,
         pl.resposta_correcta,
         pl.resposta_alumne,
         pl.explicacio,
         pl.pregunta_bank_id,
         pl.sessio_id,
         se.node_id,
         se.creat_at AS sessio_data
       FROM preguntes_log pl
       JOIN sessions_estudi se ON se.id = pl.sessio_id
       WHERE se.usuari_id = ?
         AND pl.correcte = FALSE
         AND pl.resposta_alumne IS NOT NULL
         AND se.creat_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
       ORDER BY se.creat_at DESC
       LIMIT 50`,
      [usuariId]
    );

    // Agrupar per node
    const perNode = {};
    for (const r of rows) {
      const nid = r.node_id;
      if (!perNode[nid]) {
        perNode[nid] = {
          node_id: nid,
          titol:   NODES[nid]?.titol || nid,
          materia: NODES[nid]?.materia || '',
          errors:  [],
        };
      }
      let opcions = [];
      try { opcions = JSON.parse(r.opcions); } catch {}
      if (!Array.isArray(opcions)) opcions = opcions?.opcions || [];

      perNode[nid].errors.push({
        log_id:            r.id,
        pregunta_bank_id:  r.pregunta_bank_id,
        pregunta_text:     r.pregunta_text,
        opcions,
        resposta_correcta: r.resposta_correcta,
        resposta_alumne:   r.resposta_alumne,
        explicacio:        r.explicacio || '',
        sessio_data:       r.sessio_data,
      });
    }

    return res.json(Object.values(perNode));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

// Retencio SR per matèria — decau amb el temps si no repasses
async function retencioSR(req, res) {
  const usuariId = req.usuari.id;
  const avui = new Date().toISOString().split('T')[0];

  try {
    const [rows] = await pool.query(
      `SELECT
         pb.node_id,
         COUNT(*)                                                  AS total,
         SUM(CASE WHEN sp.propera_revisio > ? THEN 1 ELSE 0 END)  AS fresques,
         AVG(sp.consecutives_correctes)                            AS nivell_mig
       FROM sr_pregunta sp
       JOIN preguntes_bank pb ON pb.id = sp.pregunta_id
       WHERE sp.usuari_id = ?
       GROUP BY pb.node_id`,
      [avui, usuariId]
    );

    // Agrupa per matèria
    const peMateria = {};
    for (const row of rows) {
      const materia = NODES[row.node_id]?.materia || row.node_id.split('-')[0];
      if (!peMateria[materia]) peMateria[materia] = { total: 0, fresques: 0, nivell_mig: 0, nodes: 0 };
      peMateria[materia].total    += parseInt(row.total);
      peMateria[materia].fresques += parseInt(row.fresques);
      peMateria[materia].nivell_mig += parseFloat(row.nivell_mig);
      peMateria[materia].nodes++;
    }

    const result = {};
    for (const [mat, d] of Object.entries(peMateria)) {
      result[mat] = {
        total:     d.total,
        fresques:  d.fresques,
        caducades: d.total - d.fresques,
        pct:       d.total > 0 ? Math.round((d.fresques / d.total) * 100) : 0,
        nivell_mig: d.nodes > 0 ? Math.round((d.nivell_mig / d.nodes) * 10) / 10 : 0,
      };
    }

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

module.exports = { meu, skillTree, revisionsAvui, srDots, errorsRecents, retencioSR };
