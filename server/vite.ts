import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Solución para __dirname en ESM
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
  const staticPath = path.join(__dirname, "..", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

// Keeping serveStatic for backward compatibility
export function serveStatic(app: express.Express) {
  const staticPath = path.join(__dirname, "..", "public");
  
  app.use(express.static(staticPath));
  
  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}
