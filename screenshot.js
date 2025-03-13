require("puppeteer").launch({ headless: "new", args: ["--no-sandbox"] }).then(async browser => {
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/error-test", { waitUntil: "networkidle0" });
  await page.screenshot({ path: "error-test-screenshot.jpg" });
  console.log("Screenshot saved to error-test-screenshot.jpg");
  await browser.close();
})
