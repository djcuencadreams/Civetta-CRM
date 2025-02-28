// Simple script to capture screenshots
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set viewport size
  await page.setViewport({ width: 1280, height: 800 });
  
  // Navigate to the reports page
  await page.goto('http://localhost:3000/#/reports', { waitUntil: 'networkidle0' });
  
  // Wait for content to load
  await page.waitForSelector('.card', { timeout: 10000 });
  
  // Take a screenshot
  await page.screenshot({ path: 'reports-page.png' });
  
  console.log('Screenshot captured: reports-page.png');
  
  await browser.close();
})().catch(err => console.error('Error taking screenshot:', err));