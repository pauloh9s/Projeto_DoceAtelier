const {Sequelize} = require('sequelize');

const sequelize = new Sequelize('testbdc', 'root', '5050666',{
    host:  'localhost',
    dialect: 'mysql'
});

module.exports = sequelize;