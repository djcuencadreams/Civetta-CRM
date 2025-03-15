const puppeteer = require('puppeteer');

async function main() {
  // Specify executable path to use system-installed Chromium
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: '/usr/bin/chromium-browser',
    headless: true
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Navigating to opportunities/new page...');
    
    // Capture console logs
    page.on('console', message => {
      console.log(`BROWSER: ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`);
    });
    
    // Check for errors
    page.on('pageerror', error => {
      console.log(`BROWSER ERROR: ${error.message}`);
    });
    
    // Navigate to the opportunities new page
    await page.goto('http://localhost:3000/opportunities/new', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    
    // Wait for an additional 2 seconds to ensure React components load
    await page.waitForTimeout(2000);
    
    console.log('Page loaded, capturing logs...');
    
    // Take screenshot
    await page.screenshot({ path: 'opportunities-new-screenshot.jpg', fullPage: true });
    
    console.log('Screenshot captured successfully!');
  } catch (error) {
    console.error('Error capturing screenshot:', error);
  } finally {
    await browser.close();
  }
}

main();