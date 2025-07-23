CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  preco NUMERIC(10, 2) NOT NULL,
  imagem_url TEXT
);
INSERT INTO produtos (nome, preco, imagem_url) VALUES
('Bolo de Chocolate', 25.00, 'https://via.placeholder.com/150'),
('Torta de Morango', 30.00, 'https://via.placeholder.com/150');