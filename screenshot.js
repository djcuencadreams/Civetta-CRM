import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/sales', { waitUntil: 'networkidle0' });
  console.log('Página cargada');
  await page.screenshot({ path: 'screenshots/sales_list.png' });
  console.log('Captura de pantalla guardada en screenshots/sales_list.png');
  
  // Abrir el diálogo de eliminación haciendo clic en el botón Eliminar
  // Usamos un selector más genérico
  await page.waitForSelector('button');
  const buttons = await page.$$('button');
  // Buscamos el botón con texto 'Eliminar'
  for (const button of buttons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text && text.includes('Eliminar')) {
      await button.click();
      break;
    }
  }
  
  await page.waitForSelector('div[role="dialog"]');
  console.log('Diálogo de eliminación abierto');
  await page.screenshot({ path: 'screenshots/delete_dialog.png' });
  console.log('Captura del diálogo guardada en screenshots/delete_dialog.png');
  
  await browser.close();
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});