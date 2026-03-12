const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Segurança e performance ──────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// ── CORS ────────────────────────────────────────────────
const allowedOrigins = [
  'https://institutometadados.com.br',
  'https://www.institutometadados.com.br',
  'http://localhost:3000',
  'http://localhost:8080'
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('CORS bloqueado: ' + origin));
  },
  credentials: true
}));

// ── Rate limiting ────────────────────────────────────────
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Muitas tentativas. Tente em 15 minutos.' } }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300 }));

// ── Body parser ──────────────────────────────────────────
app.use(express.json({ limit: '50mb' })); // 50mb para importações grandes
app.use(express.urlencoded({ extended: true }));

// ── Rotas da API ─────────────────────────────────────────
const misc = require('./routes/misc');
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/pesquisas',   require('./routes/pesquisas'));
app.use('/api/entrevistas', require('./routes/entrevistas'));
app.use('/api/numeros',     require('./routes/numeros'));
app.use('/api',             misc);  // arquivos, regioes, modelos, atividades, configs

// ── Health check ─────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── Frontend estático ────────────────────────────────────
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ── Start ────────────────────────────────────────────────
async function start() {
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Metadados API rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Falha ao iniciar:', err.message);
    process.exit(1);
  }
}

start();
