const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // USERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        login TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        perfil TEXT NOT NULL DEFAULT 'pesquisador',
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // CONFIGS
    await client.query(`
      CREATE TABLE IF NOT EXISTS configs (
        id TEXT PRIMARY KEY DEFAULT 'main',
        inatividade INT DEFAULT 15,
        acima INT DEFAULT 30,
        abaixo INT DEFAULT 30,
        abaixo_media INT DEFAULT 30,
        ativo_inatividade BOOLEAN DEFAULT true,
        ativo_acima BOOLEAN DEFAULT true,
        ativo_abaixo BOOLEAN DEFAULT true,
        ativo_abaixo_media BOOLEAN DEFAULT true,
        logo_b64 TEXT
      )
    `);

    // REGIOES
    await client.query(`
      CREATE TABLE IF NOT EXISTS regioes (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        tipo TEXT DEFAULT 'micro',
        estado TEXT,
        cidades JSONB DEFAULT '[]'
      )
    `);

    // ARQUIVOS (bases de contatos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS arquivos (
        id TEXT PRIMARY KEY,
        nome TEXT,
        tipo TEXT,
        estado TEXT,
        cidade TEXT,
        data_import TEXT,
        total_importado INT DEFAULT 0,
        criado_por_filtro BOOLEAN DEFAULT false,
        criado_em TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // NUMEROS (contatos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS numeros (
        id TEXT PRIMARY KEY,
        arquivo_id TEXT REFERENCES arquivos(id) ON DELETE CASCADE,
        telefone TEXT NOT NULL,
        estado TEXT,
        cidade TEXT,
        estado_cidade TEXT,
        tipo TEXT,
        bairro TEXT,
        endereco TEXT,
        cep TEXT,
        status TEXT DEFAULT 'disponivel',
        criado_em TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_numeros_arquivo ON numeros(arquivo_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_numeros_status ON numeros(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_numeros_estado_cidade ON numeros(estado_cidade)`);

    // MODELOS
    await client.query(`
      CREATE TABLE IF NOT EXISTS modelos (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        perguntas JSONB DEFAULT '[]',
        criado_em TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // PESQUISAS
    await client.query(`
      CREATE TABLE IF NOT EXISTS pesquisas (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        estado TEXT,
        cidade TEXT,
        regiao_id TEXT REFERENCES regioes(id) ON DELETE SET NULL,
        meta INT DEFAULT 100,
        status TEXT DEFAULT 'ativo',
        tipo_num TEXT,
        modalidade TEXT DEFAULT 'telefone',
        perguntas JSONB DEFAULT '[]',
        pesquisadores JSONB DEFAULT '[]',
        criado_em TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pesquisas_status ON pesquisas(status)`);

    // ENTREVISTAS
    await client.query(`
      CREATE TABLE IF NOT EXISTS entrevistas (
        id TEXT PRIMARY KEY,
        pesquisa_id TEXT REFERENCES pesquisas(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        user_nome TEXT,
        respostas JSONB DEFAULT '{}',
        duracao INT,
        cidade TEXT,
        dia TEXT,
        ts BIGINT,
        criado_em TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_entrevistas_pesquisa ON entrevistas(pesquisa_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_entrevistas_user ON entrevistas(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_entrevistas_dia ON entrevistas(dia)`);

    // ATIVIDADES
    await client.query(`
      CREATE TABLE IF NOT EXISTS atividades (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        user_nome TEXT,
        pesquisa_id TEXT,
        num_id TEXT,
        status TEXT,
        dia TEXT,
        ts BIGINT,
        criado_em TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ativ_user ON atividades(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ativ_dia ON atividades(dia)`);

    await client.query('COMMIT');

    // Seed: admin padrão
    const adminExists = await client.query(`SELECT id FROM users WHERE login = 'admin'`);
    if (adminExists.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('123', 10);
      await client.query(
        `INSERT INTO users (id, nome, login, senha, perfil) VALUES ($1, $2, $3, $4, $5)`,
        ['admin_default', 'Administrador', 'admin', hash, 'administrador']
      );
      console.log('✅ Usuário admin criado (login: admin / senha: 123)');
    }

    // Seed: configs padrão
    await client.query(`
      INSERT INTO configs (id) VALUES ('main')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('✅ Banco de dados inicializado.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao inicializar banco:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
