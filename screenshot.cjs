const puppeteer = require('puppeteer');

async function captureScreenshot() {
  const browser = await puppeteer.launch({ 
    headless: "new", 
    args: ["--no-sandbox"] 
  });
  
  try {
    const page = await browser.newPage();
    await page.goto("http://localhost:3000/error-test", { 
      waitUntil: "networkidle0",
      timeout: 10000
    });
    
    await page.screenshot({ path: "error-test-screenshot.jpg" });
    console.log("Screenshot saved to error-test-screenshot.jpg");
  } catch (error) {
    console.error("Error capturing screenshot:", error);
  } finally {
    await browser.close();
  }
}

captureScreenshot();