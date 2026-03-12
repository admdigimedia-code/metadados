const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { authMiddleware, adminOnly, adminOrGestor } = require('../middleware');

// GET /api/pesquisas
router.get('/', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM pesquisas ORDER BY criado_em DESC`);
    res.json(r.rows.map(p => ({
      id: p.id, nome: p.nome, estado: p.estado, cidade: p.cidade,
      regiaoId: p.regiao_id, meta: p.meta, status: p.status,
      tipoNum: p.tipo_num, modalidade: p.modalidade,
      perguntas: p.perguntas, pesquisadores: p.pesquisadores,
      criadoEm: p.criado_em
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pesquisas (admin)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { id, nome, estado, cidade, regiaoId, meta, status, tipoNum, modalidade, perguntas, pesquisadores } = req.body;
  const pid = id || uuidv4();
  try {
    await pool.query(
      `INSERT INTO pesquisas (id, nome, estado, cidade, regiao_id, meta, status, tipo_num, modalidade, perguntas, pesquisadores)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         nome=$2, estado=$3, cidade=$4, regiao_id=$5, meta=$6, status=$7,
         tipo_num=$8, modalidade=$9, perguntas=$10, pesquisadores=$11`,
      [pid, nome, estado, cidade || null, regiaoId || null, meta || 100,
       status || 'ativo', tipoNum || null, modalidade || 'telefone',
       JSON.stringify(perguntas || []), JSON.stringify(pesquisadores || [])]
    );
    res.json({ id: pid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/pesquisas/:id (admin)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query(`DELETE FROM entrevistas WHERE pesquisa_id=$1`, [req.params.id]);
    await pool.query(`DELETE FROM pesquisas WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
