require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const pool = require('./db/connection');
const { migrateNodes } = require('./scripts/migrate-nodes');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('[FATAL] JWT_SECRET no configurat o massa curt (mínim 32 caràcters). Abortant.');
  process.exit(1);
}

const app = express();
// cPanel/Passenger inyecta PORT como URL — forzar número
const PORT = parseInt(process.env.PORT) || 3000;

// Confiar en el proxy invers (Passenger/Nginx) per obtenir la IP real del client
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
// Límit global reduït (era 10mb); analitzar-imatge fa validació addicional al controlador
app.use(express.json({ limit: '6mb' }));

app.use('/api/auth',     require('./routes/auth.routes'));
app.use('/api/pregunta', require('./routes/pregunta.routes'));
app.use('/api/progres',  require('./routes/progres.routes'));
app.use('/api/grup',     require('./routes/grup.routes'));
app.use('/api/familia',  require('./routes/familia.routes'));
app.use('/api/feedback', require('./routes/feedback.routes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir frontend estàtic
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

async function ensureColumns() {
  // Crear taula feedback si no existeix
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      usuari_id   INT NULL,
      tipus       ENUM('bug','suggeriment','pregunta') DEFAULT 'bug',
      descripcio  TEXT NOT NULL,
      url_page    VARCHAR(255) NULL,
      llegit      BOOLEAN DEFAULT FALSE,
      creat_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE SET NULL
    )
  `);

  const alteracions = [
    'ALTER TABLE preguntes_bank ADD COLUMN font_oficial BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE preguntes_bank ADD INDEX idx_bank_oficial (node_id, font_oficial)',
    'ALTER TABLE preguntes_bank ADD COLUMN necessita_desenvolupament BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE preguntes_log ADD UNIQUE INDEX idx_log_sessio_slot (sessio_id, numero_pregunta)',
  ];
  for (const sql of alteracions) {
    try { await pool.query(sql); }
    catch (e) { if (e.errno !== 1060 && e.errno !== 1061) console.warn('[migration]', e.message); }
  }
}

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`PACFGM Quest API running on port ${PORT}`);
    await ensureColumns();
    await migrateNodes(pool);
  });
}

module.exports = app;
