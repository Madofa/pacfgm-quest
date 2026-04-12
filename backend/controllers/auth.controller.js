const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/connection');
const { ROOT_NODES } = require('../data/skillTree');

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
    rang:         row.rang,
    nivell:       row.nivell,
    xp_total:     row.xp_total,
    racha_dies:   row.racha_dies,
    ultima_sessio: row.ultima_sessio,
  };
}

async function register(req, res) {
  const { nom, alias, email, password, rol = 'alumne' } = req.body;

  if (!nom || !alias || !email || !password) {
    return res.status(400).json({ error: 'Falten camps obligatoris: nom, alias, email, password' });
  }

  try {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query(
      'INSERT INTO usuaris (nom, alias, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
      [nom, alias, email, password_hash, rol]
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

    return res.status(201).json({ token: signToken(usuari), usuari: formatUsuari(usuari) });
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

module.exports = { register, login, me };
