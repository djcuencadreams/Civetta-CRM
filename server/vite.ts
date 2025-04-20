import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";

// Soporte para __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function setupVite(app: express.Express) {
  const staticPath = path.join(__dirname, "..", "client", "public");
  const indexPath = path.join(staticPath, "index.html");

  // Serve static files
  app.use(express.static(staticPath));

  // Handle SPA routes - exclude API and assets
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/assets/")) {
      return next();
    }
    
    // Verify index.html exists
    if (!fs.existsSync(indexPath)) {
      console.error("index.html not found at:", indexPath);
      return res.status(500).send("Server configuration error");
    }

    res.sendFile(indexPath);
  });
}
