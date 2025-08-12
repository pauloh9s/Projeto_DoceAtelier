require('dotenv').config();
const { Client } = require('pg');
const runInitSQL = require('./runInitSQL')

async function createDatabase() {
  const dbName = process.env.DB_NAME;

  const adminClient = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: 'postgres', // banco padrão
  });

  try {
    await adminClient.connect();

    const res = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (res.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Banco de dados "${dbName}" criado com sucesso.`);
      await runInitSQL();
    } else {
      console.log(`🔁 Banco de dados "${dbName}" já existe.`);
    }
  } catch (err) {
    console.error('Erro ao criar banco de dados:', err);
  } finally {
    await adminClient.end();
  }
}

module.exports = createDatabase;