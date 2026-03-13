const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { authMiddleware, adminOnly } = require('../middleware');

// ─── ARQUIVOS ─────────────────────────────────────────────
router.get('/arquivos', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT a.*, COUNT(n.id) as total_atual
      FROM arquivos a LEFT JOIN numeros n ON n.arquivo_id = a.id
      GROUP BY a.id ORDER BY a.criado_em DESC
    `);
    res.json(r.rows.map(a => ({
      id: a.id, nome: a.nome, tipo: a.tipo, estado: a.estado, cidade: a.cidade,
      dataImport: a.data_import, totalImportado: a.total_importado,
      totalAtual: parseInt(a.total_atual), criadoPorFiltro: a.criado_por_filtro
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/arquivos', authMiddleware, adminOnly, async (req, res) => {
  const { id, nome, tipo, estado, cidade, dataImport, totalImportado, criadoPorFiltro } = req.body;
  const aid = id || uuidv4();
  try {
    await pool.query(
      `INSERT INTO arquivos (id, nome, tipo, estado, cidade, data_import, total_importado, criado_por_filtro)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET nome=$2, total_importado=$7`,
      [aid, nome, tipo || null, estado, cidade || null, dataImport || null, totalImportado || 0, criadoPorFiltro || false]
    );
    res.json({ id: aid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── REGIOES ─────────────────────────────────────────────
router.get('/regioes', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM regioes ORDER BY nome`);
    res.json(r.rows.map(r => ({
      id: r.id, nome: r.nome, tipo: r.tipo, estado: r.estado, cidades: r.cidades
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/regioes', authMiddleware, adminOnly, async (req, res) => {
  const { id, nome, tipo, estado, cidades } = req.body;
  const rid = id || uuidv4();
  try {
    await pool.query(
      `INSERT INTO regioes (id, nome, tipo, estado, cidades)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET nome=$2, tipo=$3, estado=$4, cidades=$5`,
      [rid, nome, tipo || 'micro', estado, JSON.stringify(cidades || [])]
    );
    res.json({ id: rid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/regioes/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query(`DELETE FROM regioes WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── MODELOS ─────────────────────────────────────────────
router.get('/modelos', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM modelos ORDER BY criado_em DESC`);
    res.json(r.rows.map(m => ({ id: m.id, nome: m.nome, perguntas: m.perguntas })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/modelos', authMiddleware, adminOnly, async (req, res) => {
  const { id, nome, perguntas } = req.body;
  const mid = id || uuidv4();
  try {
    await pool.query(
      `INSERT INTO modelos (id, nome, perguntas)
       VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET nome=$2, perguntas=$3`,
      [mid, nome, JSON.stringify(perguntas || [])]
    );
    res.json({ id: mid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/modelos/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query(`DELETE FROM modelos WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ATIVIDADES ──────────────────────────────────────────
router.get('/atividades', authMiddleware, async (req, res) => {
  const { userId, dia } = req.query;
  try {
    let q = `SELECT * FROM atividades WHERE 1=1`;
    const params = [];
    if (userId) { params.push(userId); q += ` AND user_id=$${params.length}`; }
    if (dia)    { params.push(dia);    q += ` AND dia=$${params.length}`; }
    q += ` ORDER BY ts DESC LIMIT 500`;
    const r = await pool.query(q, params);
    res.json(r.rows.map(a => ({
      id: a.id, userId: a.user_id, userName: a.user_nome,
      pesquisaId: a.pesquisa_id, numId: a.num_id,
      status: a.status, dia: a.dia, ts: a.ts
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/atividades', authMiddleware, async (req, res) => {
  const { id, pesquisaId, numId, status, dia, ts } = req.body;
  try {
    await pool.query(
      `INSERT INTO atividades (id, user_id, user_nome, pesquisa_id, num_id, status, dia, ts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [id || uuidv4(), req.user.id, req.user.nome,
       pesquisaId || null, numId || null, status || null,
       dia || new Date().toISOString().slice(0, 10), ts || Date.now()]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CONFIGS ─────────────────────────────────────────────
router.get('/configs', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM configs WHERE id='main'`);
    const c = r.rows[0] || {};
    res.json({
      inatividade: c.inatividade || 15,
      acima: c.acima || 30,
      abaixo: c.abaixo || 30,
      abaixoMedia: c.abaixo_media || 30,
      ativoInatividade: c.ativo_inatividade !== false,
      ativoAcima: c.ativo_acima !== false,
      ativoAbaixo: c.ativo_abaixo !== false,
      ativoAbaixoMedia: c.ativo_abaixo_media !== false,
      logoB64: c.logo_b64 || null
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/configs', authMiddleware, adminOnly, async (req, res) => {
  const { inatividade, acima, abaixo, abaixoMedia,
          ativoInatividade, ativoAcima, ativoAbaixo, ativoAbaixoMedia, logoB64 } = req.body;
  try {
    await pool.query(
      `INSERT INTO configs (id, inatividade, acima, abaixo, abaixo_media,
         ativo_inatividade, ativo_acima, ativo_abaixo, ativo_abaixo_media, logo_b64)
       VALUES ('main',$1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         inatividade=$1, acima=$2, abaixo=$3, abaixo_media=$4,
         ativo_inatividade=$5, ativo_acima=$6, ativo_abaixo=$7,
         ativo_abaixo_media=$8, logo_b64=COALESCE($9, configs.logo_b64)`,
      [inatividade || 15, acima || 30, abaixo || 30, abaixoMedia || 30,
       ativoInatividade !== false, ativoAcima !== false,
       ativoAbaixo !== false, ativoAbaixoMedia !== false,
       logoB64 || null]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
