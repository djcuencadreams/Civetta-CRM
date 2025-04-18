import express from "express";
import { setupVite } from "./vite";
import { createServer } from "http";
import { log } from "./utils";
import bodyParser from "body-parser";

const app = express();
const server = createServer(app);

app.use(bodyParser.json());

// ⚠️ Endpoint "/" para health check de Replit sin romper frontend
app.get("/", (_req, res, next) => {
  if (_req.headers["user-agent"]?.includes("ELB-HealthChecker")) {
    return res.status(200).send("OK");
  }
  return next(); // Pasa al frontend
});

// 🔥 Servir frontend React/Vite
setupVite(app);

// ✅ Escuchar en puerto asignado por Replit (o 5000 por defecto)
const PORT = parseInt(process.env.PORT || "5000", 10);
server.listen(PORT, "0.0.0.0", () => {
  log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
