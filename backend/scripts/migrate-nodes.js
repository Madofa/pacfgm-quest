/**
 * Migració: actualitza progres_nodes al nou skill tree (35 nodes reals PACFGM)
 * S'executa automàticament en arrencar el servidor.
 * També pot executar-se manualment si cal.
 */

const { NODES } = require('../data/skillTree');

const ROOT_NODES = [
  'mates-nombres',
  'catala-comprensio',
  'castella-comprensio',
  'angles-comprensio',
  'ciencies-materia',
  'tecnologia-materials',
  'social-paisatge',
];

const VALID_IDS = Object.keys(NODES);

async function migrateNodes(pool) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 0) Crear taula revisio_programada si no existeix
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS revisio_programada (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        usuari_id       INT NOT NULL,
        node_id         VARCHAR(100) NOT NULL,
        propera_revisio DATE NOT NULL,
        interval_dies   INT DEFAULT 3,
        num_revisions   INT DEFAULT 0,
        UNIQUE KEY uq_usuari_node (usuari_id, node_id),
        FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE
      )
    `);

    // 1) Eliminar progres amb node_ids obsolets
    const placeholders = VALID_IDS.map(() => '?').join(',');
    const [del] = await conn.execute(
      `DELETE FROM progres_nodes WHERE node_id NOT IN (${placeholders})`,
      VALID_IDS
    );
    if (del.affectedRows > 0) {
      console.log(`[migrate] Eliminats ${del.affectedRows} nodes obsolets`);
    }

    // 2) Obtenir tots els usuaris
    const [usuaris] = await conn.execute('SELECT id FROM usuaris');

    // 3) Re-seed nodes arrel per a cada usuari
    let seedCount = 0;
    for (const { id } of usuaris) {
      for (const nodeId of ROOT_NODES) {
        const [existing] = await conn.execute(
          'SELECT id FROM progres_nodes WHERE usuari_id = ? AND node_id = ?',
          [id, nodeId]
        );
        if (existing.length === 0) {
          await conn.execute(
            "INSERT INTO progres_nodes (usuari_id, node_id, estat) VALUES (?, ?, 'disponible')",
            [id, nodeId]
          );
          seedCount++;
        }
      }
    }

    await conn.commit();
    if (seedCount > 0) {
      console.log(`[migrate] Nodes arrel creats: ${seedCount}`);
    }
    console.log('[migrate] OK');
  } catch (err) {
    await conn.rollback();
    console.error('[migrate] ERROR:', err.message);
  } finally {
    conn.release();
  }
}

module.exports = { migrateNodes };
