const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Token não fornecido.' });
  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.perfil !== 'administrador') {
    return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  }
  next();
}

function adminOrGestor(req, res, next) {
  if (!['administrador', 'gestor'].includes(req.user?.perfil)) {
    return res.status(403).json({ error: 'Acesso restrito.' });
  }
  next();
}

module.exports = { authMiddleware, adminOnly, adminOrGestor };
