const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/connection');
const { ROOT_NODES } = require('../data/skillTree');
const { enviarRecuperacioContrasenya, enviarBenvinguda, enviarVerificacioEmail } = require('../services/email.service');

const SALT_ROUNDS = 10;

function signToken(usuari) {
  return jwt.sign(
    { id: usuari.id, email: usuari.email, rol: usuari.rol, alias: usuari.alias },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function formatUsuari(row) {
  return {
    id:           row.id,
    nom:          row.nom,
    alias:        row.alias,
    email:        row.email,
    rol:          row.rol,
    subtipus:     row.subtipus || null,
    rang:         row.rang,
    nivell:       row.nivell,
    xp_total:     row.xp_total,
    racha_dies:   row.racha_dies,
    ultima_sessio: row.ultima_sessio,
  };
}

async function register(req, res) {
  const { nom, alias, email, password, rol: rolRaw, subtipus: subtipusRaw } = req.body;

  if (!nom || !alias || !email || !password) {
    return res.status(400).json({ error: 'Falten camps obligatoris: nom, alias, email, password' });
  }

  // Únicament s'accepten rols vàlids; qualsevol altra cosa és 'alumne'
  const SUBTIPUS_MONITOR = ['pare', 'professor', 'equip'];
  const rol      = (rolRaw === 'monitor') ? 'monitor' : 'alumne';
  const subtipus = (rol === 'monitor' && SUBTIPUS_MONITOR.includes(subtipusRaw)) ? subtipusRaw : null;

  try {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query(
      'INSERT INTO usuaris (nom, alias, email, password_hash, rol, subtipus) VALUES (?, ?, ?, ?, ?, ?)',
      [nom, alias, email, password_hash, rol, subtipus]
    );

    const [rows] = await pool.query('SELECT * FROM usuaris WHERE id = ?', [result.insertId]);
    const usuari = rows[0];

    // Set root nodes as 'disponible' for this user
    if (ROOT_NODES.length > 0) {
      const values = ROOT_NODES.map(nodeId => [usuari.id, nodeId, 'disponible']);
      await pool.query(
        'INSERT INTO progres_nodes (usuari_id, node_id, estat) VALUES ?',
        [values]
      );
    }

    // Generar token de verificació i enviar correu
    const verifToken = crypto.randomBytes(32).toString('hex');
    const verifExpira = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await pool.query(
      `INSERT INTO email_verification_tokens (usuari_id, token, expira_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE token = VALUES(token), expira_at = VALUES(expira_at)`,
      [usuari.id, verifToken, verifExpira]
    );
    try { await enviarVerificacioEmail(email, nom, verifToken); } catch (_) {}

    return res.status(201).json({ pendent_verificacio: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email o alias ja existeix' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Falten email i password' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM usuaris WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credencials incorrectes' });
    }

    const usuari = rows[0];
    const valid = await bcrypt.compare(password, usuari.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credencials incorrectes' });
    }

    if (!usuari.email_verificat) {
      return res.status(403).json({ error: 'Email no verificat. Revisa el teu correu i fes clic a l\'enllaç d\'activació.' });
    }

    return res.json({ token: signToken(usuari), usuari: formatUsuari(usuari) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

async function me(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM usuaris WHERE id = ?', [req.usuari.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuari no trobat' });
    }
    return res.json(formatUsuari(rows[0]));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Cal indicar un email' });

  try {
    const [rows] = await pool.query('SELECT id, nom FROM usuaris WHERE email = ?', [email]);
    // Sempre resposta 200 per no revelar si l'email existeix
    if (rows.length === 0) return res.json({ ok: true });

    const usuari = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await pool.query(
      `INSERT INTO password_reset_tokens (usuari_id, token, expira_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE token = VALUES(token), expira_at = VALUES(expira_at)`,
      [usuari.id, token, expira]
    );

    await enviarRecuperacioContrasenya(email, usuari.nom, token);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error enviant el correu' });
  }
}

async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Falten dades' });
  if (password.length < 6) return res.status(400).json({ error: 'La contrasenya ha de tenir mínim 6 caràcters' });

  try {
    const [rows] = await pool.query(
      'SELECT usuari_id FROM password_reset_tokens WHERE token = ? AND expira_at > NOW()',
      [token]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Enllaç invàlid o caducat' });

    const usuariId = rows[0].usuari_id;
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query('UPDATE usuaris SET password_hash = ? WHERE id = ?', [hash, usuariId]);
    await pool.query('DELETE FROM password_reset_tokens WHERE usuari_id = ?', [usuariId]);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

async function verificarEmail(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token no proporcionat' });

  try {
    const [rows] = await pool.query(
      'SELECT usuari_id FROM email_verification_tokens WHERE token = ? AND expira_at > NOW()',
      [token]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Enllaç invàlid o caducat' });

    const usuariId = rows[0].usuari_id;
    await pool.query('UPDATE usuaris SET email_verificat = 1 WHERE id = ?', [usuariId]);
    await pool.query('DELETE FROM email_verification_tokens WHERE usuari_id = ?', [usuariId]);

    const [usuaris] = await pool.query('SELECT * FROM usuaris WHERE id = ?', [usuariId]);
    const usuari = usuaris[0];
    return res.json({ token: signToken(usuari), usuari: formatUsuari(usuari) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

async function actualitzarPerfil(req, res) {
  const { alias } = req.body;
  if (!alias || alias.trim().length < 2) {
    return res.status(400).json({ error: 'L\'àlies ha de tenir mínim 2 caràcters' });
  }
  const aliasNet = alias.trim().slice(0, 20);

  try {
    await pool.query(
      'UPDATE usuaris SET alias = ? WHERE id = ?',
      [aliasNet, req.usuari.id]
    );
    const [rows] = await pool.query('SELECT * FROM usuaris WHERE id = ?', [req.usuari.id]);
    return res.json({ usuari: formatUsuari(rows[0]) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Aquest àlies ja l\'utilitza un altre usuari' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Error intern' });
  }
}

module.exports = { register, login, me, forgotPassword, resetPassword, verificarEmail, actualitzarPerfil };
