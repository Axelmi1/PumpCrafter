import { Connection } from "@solana/web3.js";
import { env } from "../env";

let connection: Connection;

export function getConnection() {
  if (!connection) {
    connection = new Connection(env.RPC_URL, { commitment: "confirmed" });
  }
  return connection;
}
