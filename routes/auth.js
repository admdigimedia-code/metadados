const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha) return res.status(400).json({ error: 'Login e senha são obrigatórios.' });

  try {
    const result = await pool.query(`SELECT * FROM users WHERE login = $1 AND ativo = true`, [login]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });

    const token = jwt.sign(
      { id: user.id, login: user.login, nome: user.nome, perfil: user.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: { id: user.id, nome: user.nome, login: user.login, perfil: user.perfil }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
