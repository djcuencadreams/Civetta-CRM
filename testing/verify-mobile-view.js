import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureScreenshot() {
  console.log('Iniciando captura de pantalla de la vista móvil...');
  
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Configurar viewport para simular un dispositivo móvil
    await page.setViewport({
      width: 375,
      height: 667,
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true
    });
    
    console.log('Navegando a http://localhost:3000/...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    
    // Esperar a que los elementos principales estén cargados
    await page.waitForSelector('h1');
    
    console.log('Tomando captura de pantalla...');
    const screenshotsDir = path.join(__dirname, '../screenshots');
    
    // Crear directorio de screenshots si no existe
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    // Capturar screenshot
    const screenshotPath = path.join(screenshotsDir, 'mobile-dashboard.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    console.log(`Screenshot guardado en: ${screenshotPath}`);
  } catch (error) {
    console.error('Error al capturar la pantalla:', error);
  } finally {
    await browser.close();
    console.log('Navegador cerrado.');
  }
}

captureScreenshot();