const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { authMiddleware, adminOnly } = require('../middleware');

// GET /api/users — lista todos (admin)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`SELECT id, nome, login, perfil, ativo, criado_em FROM users ORDER BY nome`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users — cria usuário (admin)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { nome, login, senha, perfil } = req.body;
  if (!nome || !login || !senha) return res.status(400).json({ error: 'nome, login e senha são obrigatórios.' });
  try {
    const exists = await pool.query(`SELECT id FROM users WHERE login = $1`, [login]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Login já existe.' });
    const hash = await bcrypt.hash(senha, 10);
    const id = uuidv4();
    await pool.query(
      `INSERT INTO users (id, nome, login, senha, perfil) VALUES ($1,$2,$3,$4,$5)`,
      [id, nome, login, hash, perfil || 'pesquisador']
    );
    res.json({ id, nome, login, perfil: perfil || 'pesquisador' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/users/:id — edita usuário (admin)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { nome, login, senha, perfil, ativo } = req.body;
  try {
    if (senha) {
      const hash = await bcrypt.hash(senha, 10);
      await pool.query(
        `UPDATE users SET nome=$1, login=$2, senha=$3, perfil=$4, ativo=$5 WHERE id=$6`,
        [nome, login, hash, perfil, ativo !== false, req.params.id]
      );
    } else {
      await pool.query(
        `UPDATE users SET nome=$1, login=$2, perfil=$3, ativo=$4 WHERE id=$5`,
        [nome, login, perfil, ativo !== false, req.params.id]
      );
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/users/:id (admin)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  if (req.params.id === 'admin_default') return res.status(403).json({ error: 'Não é possível remover o admin padrão.' });
  try {
    await pool.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
