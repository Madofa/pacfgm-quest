/**
 * Migració: actualitza progres_nodes al nou skill tree (35 nodes reals PACFGM)
 * Executa: node backend/scripts/migrate-nodes.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), override: true });

const pool = require('../db/connection');
const { NODES } = require('../data/skillTree');

// Nodes arrel (sense pare — un per matèria)
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

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Eliminar progres amb node_ids obsolets
    const placeholders = VALID_IDS.map(() => '?').join(',');
    const [del] = await conn.execute(
      `DELETE FROM progres_nodes WHERE node_id NOT IN (${placeholders})`,
      VALID_IDS
    );
    console.log(`[migrate] Eliminats ${del.affectedRows} registres obsolets`);

    // 2) Obtenir tots els usuaris
    const [usuaris] = await conn.execute('SELECT id FROM usuaris');
    console.log(`[migrate] ${usuaris.length} usuaris trobats`);

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
    console.log(`[migrate] Creats ${seedCount} nous registres arrel`);

    await conn.commit();
    console.log('[migrate] Migració completada correctament ✓');
  } catch (err) {
    await conn.rollback();
    console.error('[migrate] ERROR — rollback:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

run();
