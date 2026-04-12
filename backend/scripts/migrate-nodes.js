/**
 * Migració: actualitza l'schema i el skill tree a l'arrencada del servidor.
 * - Crea taules noves si no existeixen (preguntes_bank, sr_pregunta, etc.)
 * - Afegeix columnes noves a preguntes_log si no existeixen
 * - Sembra els nodes arrel per a cada usuari
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

    // ── Taula tokens recuperació contrasenya ──────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        usuari_id  INT NOT NULL PRIMARY KEY,
        token      VARCHAR(64) NOT NULL,
        expira_at  DATETIME NOT NULL,
        FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE
      )
    `);

    // ── Taules noves ─────────────────────────────────────────────────────────

    // Banc de preguntes generades per Gemini (persistents i reutilitzables)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS preguntes_bank (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        node_id           VARCHAR(100) NOT NULL,
        pregunta_text     TEXT NOT NULL,
        opcions           JSON NOT NULL,
        resposta_correcta CHAR(1) NOT NULL,
        explicacio        TEXT,
        creat_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bank_node (node_id)
      )
    `);

    // SR per pregunta individual i usuari
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS sr_pregunta (
        id                     INT AUTO_INCREMENT PRIMARY KEY,
        usuari_id              INT NOT NULL,
        pregunta_id            INT NOT NULL,
        propera_revisio        DATE NOT NULL,
        interval_dies          INT DEFAULT 1,
        num_revisions          INT DEFAULT 0,
        consecutives_correctes INT DEFAULT 0,
        UNIQUE KEY uq_usuari_pregunta (usuari_id, pregunta_id),
        FOREIGN KEY (usuari_id)   REFERENCES usuaris(id) ON DELETE CASCADE,
        FOREIGN KEY (pregunta_id) REFERENCES preguntes_bank(id) ON DELETE CASCADE
      )
    `);

    // Taula de revisió per node (mantenida per compatibilitat amb migració anterior)
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

    // ── Columnes noves a preguntes_log ────────────────────────────────────────

    // pregunta_bank_id: referència al banc de preguntes
    try {
      await conn.execute(
        'ALTER TABLE preguntes_log ADD COLUMN pregunta_bank_id INT NULL'
      );
      console.log('[migrate] Columna pregunta_bank_id afegida a preguntes_log');
    } catch (err) {
      if (err.errno !== 1060) throw err; // 1060 = Duplicate column name
    }

    // explicacio: text explicatiu de la resposta correcta
    try {
      await conn.execute(
        'ALTER TABLE preguntes_log ADD COLUMN explicacio TEXT NULL'
      );
      console.log('[migrate] Columna explicacio afegida a preguntes_log');
    } catch (err) {
      if (err.errno !== 1060) throw err;
    }

    // ── Eliminar nodes obsolets ───────────────────────────────────────────────

    const placeholders = VALID_IDS.map(() => '?').join(',');
    const [del] = await conn.execute(
      `DELETE FROM progres_nodes WHERE node_id NOT IN (${placeholders})`,
      VALID_IDS
    );
    if (del.affectedRows > 0) {
      console.log(`[migrate] Eliminats ${del.affectedRows} nodes obsolets`);
    }

    // ── Sembrar nodes arrel per a cada usuari ─────────────────────────────────

    const [usuaris] = await conn.execute('SELECT id FROM usuaris');
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
    if (seedCount > 0) console.log(`[migrate] Nodes arrel creats: ${seedCount}`);
    console.log('[migrate] OK');
  } catch (err) {
    await conn.rollback();
    console.error('[migrate] ERROR:', err.message);
  } finally {
    conn.release();
  }
}

module.exports = { migrateNodes };
