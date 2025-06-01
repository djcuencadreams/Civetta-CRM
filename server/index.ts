import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3002", "http://localhost:5173"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
import { registerRoutes } from './routes.js';
registerRoutes(app);

// Configurar Vite en modo desarrollo
async function setupViteDevServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root: './client'
  });
  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);
  return vite;
}

// Configurar servidor Vite para desarrollo
if (process.env.NODE_ENV !== 'production') {
  setupViteDevServer().catch(console.error);
} else {
  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));
  
  // Catch-all handler para SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📱 CRM CIVETTA listo para usar`);
});