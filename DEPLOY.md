# 🚀 Guia de Deploy — Instituto Metadados
## Stack: Node.js + PostgreSQL no Easypanel (Hostinger VPS)
## Domínio: institutometadados.com.br

---

## ✅ PRÉ-REQUISITOS

- VPS Hostinger com Ubuntu 24.04
- Easypanel instalado (`curl -sSL https://easypanel.io/install.sh | sh`)
- Domínio `institutometadados.com.br` com acesso ao DNS
- Conta no GitHub (para fazer o deploy via Git)

---

## 📁 ESTRUTURA DO PROJETO

Organize os arquivos assim antes de enviar ao GitHub:

```
metadados/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── middleware.js
│   ├── package.json
│   └── routes/
│       ├── auth.js
│       ├── users.js
│       ├── pesquisas.js
│       ├── entrevistas.js
│       ├── numeros.js
│       └── misc.js
├── frontend/
│   └── index.html
└── Dockerfile
```

---

## 🌐 PASSO 1 — DNS do Domínio

No painel de DNS do seu registrador (onde comprou o domínio), adicione:

| Tipo | Nome | Valor            | TTL |
|------|------|------------------|-----|
| A    | @    | IP_DA_SUA_VPS    | 300 |
| A    | www  | IP_DA_SUA_VPS    | 300 |

> O IP da VPS está no painel da Hostinger.  
> Aguarde até 30 minutos para propagar.

---

## 🗃️ PASSO 2 — PostgreSQL no Easypanel

1. Acesse o Easypanel: `http://SEU_IP:3000`
2. Clique em **+ New Service → PostgreSQL**
3. Configure:
   - **Name:** `metadados-db`
   - **Password:** crie uma senha forte (ex: `MetaSec2025!`)
4. Clique em **Create**
5. Anote a **Connection String** que aparece:
   ```
   postgresql://postgres:SENHA@metadados-db:5432/metadados-db
   ```

---

## 🐳 PASSO 3 — App no Easypanel

1. Clique em **+ New App → App**
2. Configure:
   - **Name:** `metadados`
   - **Source:** GitHub (conecte seu repositório)
   - **Branch:** `main`
3. Em **Build**, selecione **Dockerfile**
4. Em **Environment Variables**, adicione:

```
DATABASE_URL=postgresql://postgres:SENHA@metadados-db:5432/metadados-db
JWT_SECRET=TROQUE_POR_UMA_CHAVE_ALEATORIA_LONGA_EX_abc123xyz789
PORT=3000
NODE_ENV=production
```

> Para gerar o JWT_SECRET:  
> Execute no terminal: `openssl rand -hex 32`

5. Em **Domains**, adicione:
   - `institutometadados.com.br`
   - `www.institutometadados.com.br`

6. O Easypanel vai gerar SSL automaticamente via Let's Encrypt ✅

7. Clique em **Deploy**

---

## 🔍 PASSO 4 — Verificar o Deploy

1. Acesse os logs do app no Easypanel
2. Você deve ver:
   ```
   ✅ Banco de dados inicializado.
   ✅ Usuário admin criado (login: admin / senha: 123)
   🚀 Metadados API rodando na porta 3000
   ```
3. Acesse: `https://institutometadados.com.br`
4. Faça login com `admin` / `123`
5. **Troque a senha do admin imediatamente!**

---

## 🔧 VARIÁVEIS DE AMBIENTE — Referência Completa

| Variável        | Obrigatória | Descrição |
|-----------------|-------------|-----------|
| `DATABASE_URL`  | ✅ Sim      | Connection string PostgreSQL |
| `JWT_SECRET`    | ✅ Sim      | Chave secreta para tokens JWT (min. 32 chars) |
| `PORT`          | Não         | Porta do servidor (padrão: 3000) |
| `NODE_ENV`      | Não         | `production` ou `development` |
| `DB_SSL`        | Não         | `true` se PostgreSQL exigir SSL |

---

## 📊 ENDPOINTS DA API — Referência

| Método | Endpoint                          | Acesso      | Descrição |
|--------|-----------------------------------|-------------|-----------|
| POST   | `/api/auth/login`                 | Público     | Login |
| GET    | `/api/users`                      | Admin       | Listar usuários |
| POST   | `/api/users`                      | Admin       | Criar usuário |
| PUT    | `/api/users/:id`                  | Admin       | Editar usuário |
| DELETE | `/api/users/:id`                  | Admin       | Remover usuário |
| GET    | `/api/pesquisas`                  | Autenticado | Listar pesquisas |
| POST   | `/api/pesquisas`                  | Admin       | Criar/editar pesquisa |
| DELETE | `/api/pesquisas/:id`              | Admin       | Remover pesquisa |
| GET    | `/api/entrevistas`                | Autenticado | Listar entrevistas |
| POST   | `/api/entrevistas`                | Autenticado | Registrar entrevista |
| GET    | `/api/numeros`                    | Autenticado | Listar números (paginado) |
| GET    | `/api/numeros/stats`              | Autenticado | Contadores por status |
| GET    | `/api/numeros/proximo`            | Autenticado | Próximo número disponível |
| PUT    | `/api/numeros/:id/status`         | Autenticado | Atualizar status |
| POST   | `/api/numeros/bulk`               | Admin       | Importar lote de números |
| DELETE | `/api/numeros/arquivo/:id`        | Admin       | Remover arquivo + números |
| PUT    | `/api/numeros/arquivo/:id/resetar`| Admin       | Resetar status dos números |
| GET    | `/api/arquivos`                   | Autenticado | Listar arquivos/bases |
| POST   | `/api/arquivos`                   | Admin       | Criar arquivo |
| GET    | `/api/regioes`                    | Autenticado | Listar regiões |
| POST   | `/api/regioes`                    | Admin       | Criar/editar região |
| DELETE | `/api/regioes/:id`                | Admin       | Remover região |
| GET    | `/api/modelos`                    | Autenticado | Listar modelos de questionário |
| POST   | `/api/modelos`                    | Admin       | Criar/editar modelo |
| DELETE | `/api/modelos/:id`                | Admin       | Remover modelo |
| GET    | `/api/atividades`                 | Autenticado | Listar atividades |
| POST   | `/api/atividades`                 | Autenticado | Registrar atividade |
| GET    | `/api/configs`                    | Autenticado | Buscar configurações |
| PUT    | `/api/configs`                    | Admin       | Salvar configurações |
| GET    | `/health`                         | Público     | Health check |

---

## 🔒 SEGURANÇA PÓS-DEPLOY

1. **Troque a senha do admin** nas Configurações → Usuários
2. **Use JWT_SECRET forte** (mínimo 32 caracteres, gerado com `openssl rand -hex 32`)
3. O rate limiting já está ativo:
   - Login: 20 tentativas / 15 minutos
   - API geral: 300 requisições / minuto
4. CORS configurado para aceitar apenas `institutometadados.com.br`

---

## 🐛 RESOLUÇÃO DE PROBLEMAS

**App não inicia:**
- Verifique se `DATABASE_URL` está correto
- Verifique os logs no Easypanel

**Erro de CORS:**
- O frontend deve ser servido pelo mesmo domínio do backend
- O Dockerfile já configura isso (backend serve o frontend estático)

**SSL não funciona:**
- Aguarde o DNS propagar (até 30 min)
- Verifique se os registros A estão corretos
- O Easypanel renova o SSL automaticamente

**Banco não conecta:**
- Confirme que o serviço PostgreSQL no Easypanel está rodando
- O nome do host interno é o nome do serviço (ex: `metadados-db`)

---

## 📦 BACKUP

Para fazer backup do banco de dados via Easypanel:
1. Acesse o serviço PostgreSQL
2. Clique em **Backup** → **Create Backup**

Para backup manual via SSH:
```bash
docker exec -t [CONTAINER_ID] pg_dump -U postgres metadados-db > backup.sql
```

---

## 🔄 ATUALIZAR O SISTEMA

Para fazer atualizações:
1. Faça push das mudanças para o GitHub
2. No Easypanel, clique em **Redeploy**

Ou configure **Auto Deploy** no Easypanel para deploy automático a cada push.
