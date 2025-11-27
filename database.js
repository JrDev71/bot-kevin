// database.js
const { PrismaClient } = require("@prisma/client");

// Cria a conexão
const prisma = new PrismaClient();

module.exports = prisma;
