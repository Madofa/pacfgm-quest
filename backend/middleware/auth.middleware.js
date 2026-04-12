const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionat' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuari = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Token invàlid o expirat' });
  }
}

module.exports = { verificarToken };
