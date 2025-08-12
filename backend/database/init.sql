CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL
);

INSERT INTO usuarios (username, senha_hash)
VALUES ('admin', '$2b$10$cRGfwvfTAsFVjM3iD3WGae6YiCEEp5o5469NeSjpGXcFWdHq150/6');

-- Categorias
CREATE TABLE IF NOT EXISTS categorias (
  nome TEXT PRIMARY KEY NOT NULL,
  descricao TEXT
);

INSERT INTO categorias (nome) VALUES ('doces');

-- Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  preco NUMERIC(10,2) NOT NULL,
  imagem_url TEXT,
  descricao VARCHAR(255),
  disponivel BOOLEAN DEFAULT TRUE,
  nome_categoria TEXT,
  FOREIGN KEY (nome_categoria) REFERENCES categorias(nome)
);

-- Encomendas
CREATE TABLE IF NOT EXISTS encomendas (
  id SERIAL PRIMARY KEY,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT,
  endereco TEXT NOT NULL,
  numero TEXT,
  forma_pagamento TEXT,
  status_encomenda TEXT,
  data_encomenda TIMESTAMP
);

-- Relacionamento Encomenda-Produtos
CREATE TABLE IF NOT EXISTS encomenda_produtos (
  id SERIAL PRIMARY KEY,
  encomenda_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC(10, 2) NOT NULL, -- Para armazenar o preço do produto no momento da compra
  FOREIGN KEY (encomenda_id) REFERENCES encomendas(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);