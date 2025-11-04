"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = getConnection;
const web3_js_1 = require("@solana/web3.js");
const env_1 = require("../env");
let connection;
function getConnection() {
    if (!connection) {
        connection = new web3_js_1.Connection(env_1.env.RPC_URL, { commitment: "confirmed" });
    }
    return connection;
}
