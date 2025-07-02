const express = require('express');
const cors = require('cors');
const bodyParse = require('body-parser');
const sequelize = require('./database/database');

async function startServer() {
try {
    await sequelize.authenticate();
    console.log('Conexão com o bando de dados bem sucedida');
} catch (error) {
    console.error ('Erro ao fazer conexão com o banco de dados:', error);
}
}
sequelize.sync();
startServer();

const app = express();
app.use(cors());
app.use(express.json())

app.listen(3000, () =>{
    console.log('Servidor rondando na porta 3000');
});