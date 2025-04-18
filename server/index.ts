// server/index.ts
import express from "express";
import { setupVite, log } from "./vite";
import { createServer } from "http";
import bodyParser from "body-parser";
import { registerRoutes } from "./routes-fixed";
// Comentadas temporalmente para diagnosticar el problema
// import { registerOrderRoutes } from "./routes-orders-new";
// import { registerConfigurationRoutes } from "./routes-configuration";
// import { registerEmailRoutes } from "./routes-email";
// import { registerAdditionalRoutes } from "./routes-extension";

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

// Registrar las rutas básicas de la API para diagnóstico
console.log("Registrando rutas básicas para diagnóstico...");
registerRoutes(app);

// Rutas adicionales comentadas temporalmente
// registerOrderRoutes(app);
// registerConfigurationRoutes(app);
// registerEmailRoutes(app);
// registerAdditionalRoutes(app);

// 🔥 Servir frontend React/Vite
setupVite(app);

// ✅ Escuchar en puerto asignado por Replit (o 5000 por defecto)
const PORT = parseInt(process.env.PORT || "5000", 10);
server.listen(PORT, "0.0.0.0", () => {
  log(`🚀 Servidor escuchando en puerto ${PORT}`);
});