const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { authMiddleware, adminOnly, adminOrGestor } = require('../middleware');

// GET /api/entrevistas?pesquisaId=xxx
router.get('/', authMiddleware, async (req, res) => {
  const { pesquisaId, userId, dia } = req.query;
  try {
    let q = `SELECT * FROM entrevistas WHERE 1=1`;
    const params = [];
    if (pesquisaId) { params.push(pesquisaId); q += ` AND pesquisa_id=$${params.length}`; }
    if (userId)     { params.push(userId);     q += ` AND user_id=$${params.length}`; }
    if (dia)        { params.push(dia);         q += ` AND dia=$${params.length}`; }
    q += ` ORDER BY criado_em DESC`;
    const r = await pool.query(q, params);
    res.json(r.rows.map(e => ({
      id: e.id, pesquisaId: e.pesquisa_id, userId: e.user_id, userName: e.user_nome,
      respostas: e.respostas, duracao: e.duracao, cidade: e.cidade,
      dia: e.dia, ts: e.ts
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/entrevistas — registra entrevista
router.post('/', authMiddleware, async (req, res) => {
  const { id, pesquisaId, userId, userName, respostas, duracao, cidade, dia, ts } = req.body;
  const eid = id || uuidv4();
  try {
    await pool.query(
      `INSERT INTO entrevistas (id, pesquisa_id, user_id, user_nome, respostas, duracao, cidade, dia, ts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [eid, pesquisaId, userId || req.user.id, userName || req.user.nome,
       JSON.stringify(respostas || {}), duracao || null, cidade || null,
       dia || new Date().toISOString().slice(0, 10), ts || Date.now()]
    );
    res.json({ id: eid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/entrevistas/:id (admin)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query(`DELETE FROM entrevistas WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
