const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { authMiddleware, adminOnly } = require('../middleware');

// GET /api/numeros — com filtros e paginação
router.get('/', authMiddleware, async (req, res) => {
  const { status, estado, cidade, arquivoId, q, page = 1, limit = 50 } = req.query;
  try {
    let where = `WHERE 1=1`;
    const params = [];
    if (status && status !== 'todos') { params.push(status); where += ` AND n.status=$${params.length}`; }
    if (estado)    { params.push(estado);    where += ` AND n.estado=$${params.length}`; }
    if (cidade)    { params.push(cidade);    where += ` AND n.cidade=$${params.length}`; }
    if (arquivoId) { params.push(arquivoId); where += ` AND n.arquivo_id=$${params.length}`; }
    if (q)         { params.push(`%${q}%`);  where += ` AND (n.telefone ILIKE $${params.length} OR n.cidade ILIKE $${params.length})`; }

    const countR = await pool.query(`SELECT COUNT(*) FROM numeros n ${where}`, params);
    const total = parseInt(countR.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit)); params.push(offset);
    const r = await pool.query(
      `SELECT n.*, a.nome as arquivo_nome FROM numeros n
       LEFT JOIN arquivos a ON a.id = n.arquivo_id
       ${where} ORDER BY n.criado_em DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: r.rows.map(n => ({
        id: n.id, arquivoId: n.arquivo_id, arquivoNome: n.arquivo_nome,
        telefone: n.telefone, estado: n.estado, cidade: n.cidade,
        estadoCidade: n.estado_cidade, tipo: n.tipo, bairro: n.bairro,
        endereco: n.endereco, cep: n.cep, status: n.status
      }))
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/numeros/stats — contadores por status
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`SELECT status, COUNT(*) as cnt FROM numeros GROUP BY status`);
    const stats = { disponivel: 0, ocupado: 0, 'nao-atendeu': 0, atendeu: 0, inexistente: 0, total: 0 };
    r.rows.forEach(row => { stats[row.status] = parseInt(row.cnt); stats.total += parseInt(row.cnt); });
    const pesqR = await pool.query(`SELECT COUNT(*) FROM pesquisas`);
    stats.pesquisas = parseInt(pesqR.rows[0].count);
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/numeros/proximo — próximo número disponível para discagem
router.get('/proximo', authMiddleware, async (req, res) => {
  const { pesquisaId } = req.query;
  if (!pesquisaId) return res.status(400).json({ error: 'pesquisaId obrigatório.' });
  try {
    const pesq = await pool.query(`SELECT * FROM pesquisas WHERE id=$1`, [pesquisaId]);
    if (!pesq.rows[0]) return res.status(404).json({ error: 'Pesquisa não encontrada.' });
    const p = pesq.rows[0];

    let where = `WHERE n.status='disponivel'`;
    const params = [];
    if (p.estado) { params.push(p.estado); where += ` AND n.estado=$${params.length}`; }
    if (p.tipo_num) { params.push(p.tipo_num); where += ` AND n.tipo=$${params.length}`; }

    const r = await pool.query(
      `SELECT * FROM numeros n ${where} ORDER BY RANDOM() LIMIT 1`, params
    );
    if (!r.rows[0]) return res.json(null);
    const n = r.rows[0];
    res.json({
      id: n.id, telefone: n.telefone, estado: n.estado, cidade: n.cidade,
      tipo: n.tipo, bairro: n.bairro, status: n.status
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/numeros/:id/status — atualiza status
router.put('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const validStatus = ['disponivel', 'ocupado', 'nao-atendeu', 'atendeu', 'inexistente'];
  if (!validStatus.includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  try {
    if (status === 'inexistente') {
      await pool.query(`DELETE FROM numeros WHERE id=$1`, [req.params.id]);
    } else {
      await pool.query(`UPDATE numeros SET status=$1 WHERE id=$2`, [status, req.params.id]);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/numeros/bulk — importação em lote
router.post('/bulk', authMiddleware, adminOnly, async (req, res) => {
  const { arquivoId, estado, cidade, tipo, numeros } = req.body;
  if (!Array.isArray(numeros) || !arquivoId) return res.status(400).json({ error: 'Dados inválidos.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inseridos = 0;
    const estadoCidade = `${estado}__${cidade}`;

    // Busca telefones já existentes para evitar duplicatas
    const existR = await client.query(`SELECT telefone FROM numeros WHERE estado=$1`, [estado]);
    const existSet = new Set(existR.rows.map(r => r.telefone));

    // Insere em lotes de 500
    const batch = 500;
    for (let i = 0; i < numeros.length; i += batch) {
      const slice = numeros.slice(i, i + batch).filter(n => !existSet.has(n.telefone));
      if (slice.length === 0) continue;

      const values = slice.map((n, idx) => {
        const base = idx * 9;
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9})`;
      }).join(',');

      const params = slice.flatMap(n => [
        uuidv4(), arquivoId, n.telefone, estado, n.cidade || cidade,
        estadoCidade, tipo || null, n.bairro || null, n.endereco || null
      ]);

      await client.query(
        `INSERT INTO numeros (id, arquivo_id, telefone, estado, cidade, estado_cidade, tipo, bairro, endereco)
         VALUES ${values} ON CONFLICT DO NOTHING`,
        params
      );
      inseridos += slice.length;
      slice.forEach(n => existSet.add(n.telefone));
    }

    // Atualiza total no arquivo
    await client.query(`UPDATE arquivos SET total_importado=$1 WHERE id=$2`, [inseridos, arquivoId]);

    await client.query('COMMIT');
    res.json({ inseridos });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/numeros/arquivo/:arquivoId — remove todos os números de um arquivo
router.delete('/arquivo/:arquivoId', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query(`DELETE FROM numeros WHERE arquivo_id=$1`, [req.params.arquivoId]);
    await pool.query(`DELETE FROM arquivos WHERE id=$1`, [req.params.arquivoId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/numeros/arquivo/:arquivoId/resetar — reseta status para disponivel
router.put('/arquivo/:arquivoId/resetar', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query(
      `UPDATE numeros SET status='disponivel' WHERE arquivo_id=$1 AND status IN ('atendeu','ocupado','nao-atendeu')`,
      [req.params.arquivoId]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
