const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runInitSQL() {
  const sqlPath = path.join(__dirname, 'init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log("DB_USER:", process.env.DB_USER);
  console.log("DB_PASSWORD:", process.env.DB_PASSWORD);

  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log('SQL de inicialização executado com sucesso!');
  } catch (err) {
    console.error('Erro ao executar init.sql:', err);
  } finally {
    await client.end();
  }
}

module.exports = runInitSQL;