const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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
    
    console.log('Navigating to products page...');
    await page.goto('http://localhost:3000/products', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForSelector('h1', { timeout: 5000 }).catch(() => console.log('Header not found'));
    
    // Take a screenshot
    console.log('Taking screenshot...');
    const screenshotPath = path.join(__dirname, 'screenshots');
    
    // Create screenshots directory if it doesn't exist
    if (!fs.existsSync(screenshotPath)) {
      fs.mkdirSync(screenshotPath, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filePath = path.join(screenshotPath, `products-page-${timestamp}.png`);
    
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Screenshot saved to: ${filePath}`);
    
    // Get page title and heading
    const title = await page.title();
    const heading = await page.$eval('h1', el => el.textContent).catch(() => 'No heading found');
    console.log(`Page title: ${title}`);
    console.log(`Page heading: ${heading}`);
    
    // Check if product table is visible
    const hasTable = await page.$('table').then(bool => !!bool).catch(() => false);
    console.log(`Product table visible: ${hasTable}`);
    
    // Check for navigation
    const hasNavigation = await page.$('.nav').then(bool => !!bool).catch(() => false);
    console.log(`Navigation visible: ${hasNavigation}`);
    
    return { title, heading, hasTable, hasNavigation, filePath };
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