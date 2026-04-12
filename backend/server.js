require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db/connection');
const { migrateNodes } = require('./scripts/migrate-nodes');

const app = express();
// cPanel/Passenger inyecta PORT como URL — forzar número
const PORT = parseInt(process.env.PORT) || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.use('/api/auth',     require('./routes/auth.routes'));
app.use('/api/pregunta', require('./routes/pregunta.routes'));
app.use('/api/progres',  require('./routes/progres.routes'));
app.use('/api/grup',     require('./routes/grup.routes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir frontend estàtic
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`PACFGM Quest API running on port ${PORT}`);
    await migrateNodes(pool);
  });
}

module.exports = app;
