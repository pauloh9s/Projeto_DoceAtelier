require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const pool = require('./database/db')
const createDatabase = require('./database/createDatabase')

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use(express.json());
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, '..', 'public')));

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
        const { rows } = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
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

// Separar em outro arquivo (   RouteProdutos.js   )
// CRUD Produtos
//Rota para clientes
app.get('/api/produtos', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM produtos WHERE disponivel = TRUE');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar produtos para o cliente:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// Rota protegida para o Dashboard - Retorna TODOS os produtos
app.get('/api/admin/produtos', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM produtos');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar produtos para o admin:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});
// Adiciona novo Produto
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
});

//Editar Produto
app.put('/api/produtos/:id', authenticateToken, upload.single('imagem'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, preco, descricao, nome_categoria, imagem_url } = req.body;
        
        // Determina a URL da imagem
        const final_imagem_url = req.file ? `/uploads/${req.file.filename}` : imagem_url;

        // Note que `nome_categoria` é a coluna que você usa
        const updateProduto = await pool.query(
            "UPDATE produtos SET nome = $1, preco = $2, descricao = $3, nome_categoria = $4, imagem_url = $5 WHERE id = $6 RETURNING *",
            [nome, preco, descricao, nome_categoria, final_imagem_url, id]
        );

        res.json(updateProduto.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erro no servidor");
    }
});
//Deletar Produto
app.delete('/api/produtos/:id', authenticateToken, async (req, res) => {
    const produtoId = req.params.id;

    try {
        // 1. Buscar o produto para saber o nome da imagem
        const result = await pool.query('SELECT imagem_url FROM produtos WHERE id = $1', [produtoId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ erro: 'Produto não encontrado' });
        }

        const imagemUrl = result.rows[0].imagem_url;

        // 2. Deletar o arquivo da imagem, se existir
        // Garante que o caminho da imagem é construído corretamente
        if (imagemUrl) {
            const nomeImagem = path.basename(imagemUrl); // Extrai apenas o nome do arquivo da URL, caso ela contenha o caminho completo
            const caminhoImagem = path.join(__dirname, 'uploads', nomeImagem);

            if (fs.existsSync(caminhoImagem)) {
                fs.unlinkSync(caminhoImagem); // Remove o arquivo da pasta uploads
                console.log(`Imagem ${nomeImagem} deletada com sucesso.`);
            } else {
                console.log(`Arquivo de imagem não encontrado em: ${caminhoImagem}`);
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

// Alterar a disponibilidade do produto
app.put('/api/produtos/:id/disponibilidade', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { disponivel } = req.body;
        
        await pool.query(
            "UPDATE produtos SET disponivel = $1 WHERE id = $2",
            [disponivel, id]
        );

        res.sendStatus(200);
    } catch (err) {
        console.error('Erro ao atualizar a disponibilidade:', err.message);
        res.status(500).send("Erro no servidor");
    }
});

// Encomendas
// Separar RouteEncomenda.js
// Cria nova Encomenda
app.post('/api/encomendas', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Inicia uma transação

        const { cliente_nome, cliente_email, endereco, numero, forma_pagamento, produtos, data_encomenda } = req.body;

        // 1. Inserir a nova encomenda na tabela 'encomendas'
        const encomendaRes = await client.query(
            `INSERT INTO encomendas (cliente_nome, cliente_email, endereco, numero, forma_pagamento, status_encomenda, data_encomenda)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [cliente_nome, cliente_email, endereco, numero, forma_pagamento, 'Aceitar', data_encomenda]
        );
        const encomendaId = encomendaRes.rows[0].id;

        // 2. Iterar sobre a lista de produtos para inserir na tabela 'encomenda_produtos'
        for (const produto of produtos) {
            // O seu frontend já envia um objeto com 'id', 'quantidade' e 'preco'
            const { id, quantidade, preco } = produto;

            // 3. Inserir na tabela 'encomenda_produtos'
            await client.query(
                `INSERT INTO encomenda_produtos (encomenda_id, produto_id, quantidade, preco_unitario)
                 VALUES ($1, $2, $3, $4)`,
                [encomendaId, id, quantidade, preco] // Correção: Passa a variável 'preco' para a query
            );
        }

        await client.query('COMMIT'); // Finaliza a transação
        res.status(201).json({ mensagem: 'Encomenda criada com sucesso!', encomendaId });
    } catch (error) {
        await client.query('ROLLBACK'); // Desfaz a transação em caso de erro
        console.error('Erro ao criar encomenda:', error);
        res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
});

// Seleciona a lista de encomendas
app.get('/api/encomendas', async (req, res) => {
    const client = await pool.connect();
    try {
        // Query para obter todas as encomendas
        const encomendasQuery = await client.query('SELECT * FROM encomendas ORDER BY id DESC');
        const encomendas = encomendasQuery.rows;

        // Para cada encomenda, buscar os produtos associados
        for (const encomenda of encomendas) {
            const produtosQuery = await client.query(
                `SELECT ep.quantidade, ep.preco_unitario, p.nome AS nome_produto, p.imagem_url 
                 FROM encomenda_produtos ep
                 JOIN produtos p ON ep.produto_id = p.id
                 WHERE ep.encomenda_id = $1`,
                [encomenda.id]
            );
            encomenda.produtos = produtosQuery.rows;
        }

        res.json(encomendas);
    } catch (error) {
        console.error('Erro ao buscar encomendas:', error);
        res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
});
// Deleta a encomenda
app.delete('/api/encomendas/:id', authenticateToken, async (req, res) => {
    await pool.query('DELETE FROM encomendas WHERE id = $1', [req.params.id]);
    res.sendStatus(200);
});

app.patch('/api/encomendas/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status_encomenda } = req.body;

    // Adicione uma verificação de segurança para garantir que o status é válido
    const statusValidos = ['Aceitar', 'Em Produção', 'Saiu para entrega', 'Entregue'];
    if (!statusValidos.includes(status_encomenda)) {
        return res.status(400).json({ mensagem: 'Status de encomenda inválido.' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            'UPDATE encomendas SET status_encomenda = $1 WHERE id = $2 RETURNING *',
            [status_encomenda, id]
        );

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ mensagem: 'Encomenda não encontrada.' });
        }
    } catch (error) {
        console.error('Erro ao atualizar status da encomenda:', error);
        res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
});

// --- Rotas para o CRUD de Categorias ---

// Rota GET para listar todas as categorias (Pública)
app.get('/api/categorias', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM categorias ORDER BY nome ASC');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

// Rota POST para criar uma nova categoria (Protegida)
app.post('/api/categorias', authenticateToken, async (req, res) => {
    const { nome, descricao } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO categorias (nome, descricao) VALUES ($1, $2) RETURNING *',
            [nome, descricao]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({ error: 'Erro ao criar categoria' });
    }
});

// Rota PUT para atualizar uma categoria (Protegida)
app.put('/api/categorias/:nome', authenticateToken, async (req, res) => {
    const { nome } = req.params; // Este é o nome original da categoria
    const { nome: novoNome, descricao } = req.body; // 'nome' é o novo nome no corpo da requisição
    try {
        const { rows } = await pool.query(
            'UPDATE categorias SET nome = $1, descricao = $2 WHERE nome = $3 RETURNING *',
            [novoNome, descricao, nome] // Aqui é a ordem correta para a query
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
});

// Rota DELETE para deletar uma categoria (Protegida)
app.delete('/api/categorias/:nome', authenticateToken, async (req, res) => {
    const { nome } = req.params;
    try {
        await pool.query('UPDATE produtos SET nome_categoria = NULL WHERE nome_categoria = $1', [nome]);
        const { rowCount } = await pool.query('DELETE FROM categorias WHERE nome = $1', [nome]);
        
        if (rowCount === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        res.sendStatus(204);
    } catch (error) {
        console.error('Erro ao deletar categoria:', error);
        res.status(500).json({ error: 'Erro ao deletar categoria' });
    }
});
