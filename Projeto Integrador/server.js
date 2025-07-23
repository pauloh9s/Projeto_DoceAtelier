require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

// Conexão com PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middlewares
app.use(express.json());
app.use(express.static('public'));

// Função para verificar token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// CRUD Produtos
app.get('/api/produtos', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM produtos');
  res.json(rows);
});

app.post('/api/produtos', authenticateToken, async (req, res) => {
  const { nome, preco, imagem_url } = req.body;
  await pool.query(
    'INSERT INTO produtos (nome, preco, imagem_url) VALUES ($1, $2, $3)',
    [nome, preco, imagem_url]
  );
  res.sendStatus(201);
});

app.delete('/api/encomendas/:id', authenticateToken, async (req, res) => {
  await pool.query('DELETE FROM encomendas WHERE id = $1', [req.params.id]);
  res.sendStatus(200);
});

app.put('/api/produtos/:id', authenticateToken, async (req, res) => {
  const { nome, preco, imagem_url } = req.body;
  await pool.query(
    'UPDATE produtos SET nome = $1, preco = $2, imagem_url = $3 WHERE id = $4',
    [nome, preco, imagem_url, req.params.id]
  );
  res.sendStatus(200);
});

// Autenticação
app.post('/api/login', async (req, res) => {
  try {
    console.log('Request body:', req.body);
    
    const { username, email, senha } = req.body;

    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE username = $1 AND email = $2',
      [username, email]
    );
    console.log('DB result:', rows);

    const user = rows[0];
    if (!user) return res.status(400).send('Usuário não encontrado');

    const valid = await bcrypt.compare(senha, user.senha_hash);
    if (!valid) return res.status(400).send('Senha incorreta');

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('Erro na rota /api/login:', err.message);
    res.status(500).send('Erro interno no servidor');
  }
});

// Encomendas
app.post('/api/encomendas', async (req, res) => {
  const { cliente_nome, cliente_email, endereco, numero, forma_pagamento, produtos } = req.body;

  const result = await pool.query(
    'INSERT INTO encomendas (cliente_nome, cliente_email, endereco, numero, forma_pagamento) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [cliente_nome, cliente_email, endereco, numero, forma_pagamento]
  );
  const encomendaId = result.rows[0].id;

  for (let p of produtos) {
    await pool.query(
      'INSERT INTO encomenda_produtos (encomenda_id, produto_id) VALUES ($1, $2)',
      [encomendaId, p.id]
    );
  }
  res.sendStatus(201);
});

app.get('/api/encomendas', authenticateToken, async (req, res) => {
  const encomendasRes = await pool.query('SELECT * FROM encomendas');
  const encomendas = await Promise.all(encomendasRes.rows.map(async (e) => {
    const produtosRes = await pool.query(
      `SELECT p.* FROM produtos p
       JOIN encomenda_produtos ep ON ep.produto_id = p.id
       WHERE ep.encomenda_id = $1`,
      [e.id]
    );
    return { ...e, produtos: produtosRes.rows };
  }));
  res.json(encomendas);
});

// Start
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
