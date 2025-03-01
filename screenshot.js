import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

async function captureScreenshot() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: "new"
  });
  
  try {
    console.log('Opening page...');
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Navigating to orders page...');
    await page.goto('http://localhost:3000/orders', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForSelector('h1', { timeout: 5000 }).catch(() => console.log('Header not found'));
    
    // Take a screenshot
    console.log('Taking screenshot...');
    const screenshotPath = path.join(process.cwd(), 'screenshots');
    
    // Create screenshots directory if it doesn't exist
    if (!fs.existsSync(screenshotPath)) {
      fs.mkdirSync(screenshotPath, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filePath = path.join(screenshotPath, `orders-page-${timestamp}.png`);
    
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Screenshot saved to: ${filePath}`);
    
    // Test the "Nuevo Pedido" button
    console.log('Testing Nuevo Pedido button...');
    await page.click('button:has-text("Nuevo Pedido")');
    
    // Wait for the dialog to appear
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 })
      .then(() => console.log('Dialog opened successfully!'))
      .catch(() => console.log('Dialog failed to open'));
    
    // Take another screenshot with the dialog open
    const dialogFilePath = path.join(screenshotPath, `orders-dialog-${timestamp}.png`);
    await page.screenshot({ path: dialogFilePath, fullPage: false });
    console.log(`Dialog screenshot saved to: ${dialogFilePath}`);
    
    return { filePath, dialogFilePath };
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

// Run the function
captureScreenshot().catch(console.error);