import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/orders', { waitUntil: 'networkidle0' });
  console.log('Página de órdenes cargada');
  await page.screenshot({ path: 'screenshots/orders_list.png' });
  console.log('Captura de pantalla guardada en screenshots/orders_list.png');
  
  // Capturar la versión móvil
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: 'screenshots/orders_list_mobile.png' });
  console.log('Captura de la versión móvil guardada en screenshots/orders_list_mobile.png');

  // Volver a la vista de escritorio
  await page.setViewport({ width: 1280, height: 800 });
  
  // Intentar abrir un formulario u otra acción
  try {
    await page.waitForSelector('button', { timeout: 5000 });
    const buttons = await page.$$('button');
    let buttonFound = false;
    
    // Buscamos un botón de acción como 'Nuevo pedido' o similar
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && (text.includes('Nuevo') || text.includes('Agregar') || text.includes('Crear'))) {
        await button.click();
        buttonFound = true;
        console.log(`Botón "${text}" encontrado y clickeado`);
        break;
      }
    }
    
    if (buttonFound) {
      // Esperamos algún diálogo o formulario
      try {
        await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
        console.log('Formulario o diálogo abierto');
        await page.screenshot({ path: 'screenshots/order_form.png' });
        console.log('Captura del formulario guardada en screenshots/order_form.png');
      } catch (err) {
        console.log('No se detectó un diálogo, pero continuamos');
      }
    } else {
      console.log('No se encontró un botón de acción en la página');
    }
  } catch (err) {
    console.log('Error al interactuar con la página:', err.message);
  }
  
  await browser.close();
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});