"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.initDB = initDB;
const client_1 = require("@prisma/client");
exports.prisma = new client_1.PrismaClient();
async function initDB() {
    await exports.prisma.$queryRaw `SELECT 1`; // quick check
}
