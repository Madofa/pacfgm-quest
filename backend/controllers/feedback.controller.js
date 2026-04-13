const pool = require('../db/connection');
const { enviarFeedback } = require('../services/email.service');

async function enviar(req, res) {
  const { tipus = 'bug', descripcio, url_page } = req.body;
  const usuariId = req.usuari?.id || null;
  const alias    = req.usuari?.alias || 'anònim';

  if (!descripcio || descripcio.trim().length < 5) {
    return res.status(400).json({ error: 'La descripció és massa curta' });
  }

  try {
    await pool.query(
      'INSERT INTO feedback (usuari_id, tipus, descripcio, url_page) VALUES (?, ?, ?, ?)',
      [usuariId, tipus, descripcio.trim(), url_page || null]
    );

    // Email de notificació (no bloqueja la resposta si falla)
    try {
      await enviarFeedback({ alias, tipus, descripcio: descripcio.trim(), url_page });
    } catch (e) {
      console.warn('[feedback] Email error:', e.message);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

module.exports = { enviar };
