import { ChromaClient } from "chromadb";

const client = new ChromaClient({ baseUrl: "http://localhost:8000" });

try {
  const res = await client.heartbeat();
  console.log("ChromaDB heartbeat OK:", res); // should print { message: 'OK' }
} catch (err) {
  console.error("ChromaDB heartbeat failed:", err.message);
}
