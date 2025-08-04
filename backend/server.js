require('dotenv').config();
const express = require('express');
const path = require('path');
<<<<<<< Updated upstream
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
=======
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
>>>>>>> Stashed changes
const pool = require('./database/db')
const createDatabase = require('./database/createDatabase')

const app = express();
const PORT = process.env.PORT || 3000;

<<<<<<< Updated upstream
// Middlewares
=======
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middlewares
// Define onde salvar as imagens e com que nome
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads')); // Salva as imagens na pasta "uploads" do projeto
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName); // Gera um nome único para cada imagem
  }
});

const upload = multer({ storage });
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
>>>>>>> Stashed changes
app.use(express.json());
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, '..', 'public')));

<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
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

// Autenticação & Requisição Admin
app.post('/api/login', async (req, res) => {
  console.log("--------------------")
  try {
    const { username, senha } = req.body;
    console.log('Dados recebidos:', { username, senha });

    console.log('Antes do SELECT');
<<<<<<< Updated upstream
    const {rows} = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
=======
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
>>>>>>> Stashed changes
    console.log('Depois do SELECT');

    const user = rows[0];
    console.log('Usuário encontrado:', user);

    if (!user) return res.status(404).send('Usuário não encontrado');

    const valid = await bcrypt.compare(senha, user.senha_hash);
    console.log('Senha válida:', valid);

    if (!valid) return res.status(400).send('Senha incorreta');

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Token gerado:', token);

    res.json({ token });
  } catch (err) {
    console.error('Erro na rota /api/login:', err.stack);
    res.status(500).send('Erro interno no servidor');
  }
});

// Start
(async () => {
  await createDatabase(); // cria o banco antes de continuar
  // Agora o banco existe, pode usar o pool normalmente
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
})();

<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
// Separar em outro arquivo (  RouteProdutos.js  )
// CRUD Produtos
app.get('/api/produtos', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM produtos');
  res.json(rows);
});

// Adiciona novo Produto
<<<<<<< Updated upstream
app.post('/api/produtos', authenticateToken, async (req, res) => {
  const { nome, preco, imagem_url } = req.body;
  await pool.query(
    'INSERT INTO produtos (nome, preco, imagem_url) VALUES ($1, $2, $3)',
    [nome, preco, imagem_url]
  );
  res.sendStatus(201);
=======
app.post('/api/produtos', authenticateToken, upload.single('imagem'), async (req, res) => {
  console.log('Arquivo recebido:', req.file); // Verifica o arquivo enviado
  const { nome, preco, descricao, nome_categoria } = req.body;
  
  const imagem_url = req.file ? `/uploads/${req.file.filename}` : null;

  console.log('Imagem URL:', imagem_url); // Verifica a URL da imagem

  try {
    await pool.query(
      'INSERT INTO produtos (nome, preco, imagem_url, descricao, nome_categoria) VALUES ($1, $2, $3, $4, $5)',
      [nome, preco, imagem_url, descricao, nome_categoria]
    );
    res.sendStatus(201);
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    res.status(500).send(`Erro ao inserir produto: ${error.message}`);
  }
>>>>>>> Stashed changes
});

//Editar Produto
app.put('/api/produtos/:id', authenticateToken, async (req, res) => {
<<<<<<< Updated upstream
  const { nome, preco, imagem_url } = req.body;
  await pool.query(
    'UPDATE produtos SET nome = $1, preco = $2, imagem_url = $3 WHERE id = $4',
    [nome, preco, imagem_url, req.params.id]
=======
  const { nome, preco, imagem_url, descricao, nome_categoria } = req.body;
  await pool.query(
    'UPDATE produtos SET nome = $1, preco = $2, imagem_url = $3, descricao = $4, nome_categoria = $5 WHERE id = $6',
    [nome, preco, imagem_url, descricao, nome_categoria, req.params.id]
>>>>>>> Stashed changes
  );
  res.sendStatus(200);
});

<<<<<<< Updated upstream
=======
//Deletar Produto
app.delete('/api/produtos/:id', authenticateToken, async (req, res) => {
  const produtoId = req.params.id;

  try {
    // 1. Buscar o produto para saber o nome da imagem
    const result = await pool.query('SELECT imagem_url FROM produtos WHERE id = $1', [produtoId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    const nomeImagem = result.rows[0].imagem;

    // 2. Deletar o arquivo da imagem, se existir
    if (nomeImagem) {
      const caminhoImagem = path.join(__dirname, 'uploads', nomeImagem);

      if (fs.existsSync(caminhoImagem)) {
        fs.unlinkSync(caminhoImagem); // remove o arquivo da pasta uploads
      }
    }

    // 3. Deletar o produto do banco
    await pool.query('DELETE FROM produtos WHERE id = $1', [produtoId]);

    res.sendStatus(200);
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ erro: 'Erro ao deletar produto' });
  }
});

>>>>>>> Stashed changes
// Encomendas
// Separar RouteEncomenda.js
// Cria nova Encomenda
app.post('/api/encomendas', async (req, res) => {
  const { cliente_nome, cliente_email, endereco, numero, forma_pagamento, produtos } = req.body;

  const result = await pool.query(
    'INSERT INTO encomendas (cliente_nome, cliente_email, endereco, numero, forma_pagamento) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [cliente_nome, cliente_email, endereco, numero, forma_pagamento]
  );
  const encomendaId = result.rows[0].id;
  //Adiciona os produtos selecionados para dentro da encomenda
  for (let p of produtos) {
    await pool.query(
      'INSERT INTO encomenda_produtos (encomenda_id, produto_id) VALUES ($1, $2)',
      [encomendaId, p.id]
    );
  }
  res.sendStatus(201);
});
// Seleciona a lista de encomendas
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
// Deleta a encomenda
app.delete('/api/encomendas/:id', authenticateToken, async (req, res) => {
  await pool.query('DELETE FROM encomendas WHERE id = $1', [req.params.id]);
  res.sendStatus(200);
});

<<<<<<< Updated upstream
=======
app.get('/api/categorias', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM categorias');
  res.json(rows);
});

>>>>>>> Stashed changes
