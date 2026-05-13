import { chromium } from 'C:/Users/matheus.soares/AppData/Local/Temp/node_modules/playwright-chromium/index.js';
import { resolve } from 'path';

const OUT = resolve('scratch/screenshots');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro size
const page = await context.newPage();

// --- 1. Showcase: full page ---
await page.goto('http://localhost:3000/food-fast', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/01-showcase-full.png`, fullPage: true });
console.log('01 done');

// --- 2. Showcase: hero banner visible ---
await page.screenshot({ path: `${OUT}/02-showcase-top.png` });
console.log('02 done');

// --- 3. Scroll to product grid ---
await page.evaluate(() => window.scrollTo(0, 400));
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/03-showcase-products.png` });
console.log('03 done');

// --- 4. Open ProductDetailsModal ---
const firstDetailsBtn = page.locator('button', { hasText: 'Detalhes' }).first();
if (await firstDetailsBtn.isVisible()) {
  await firstDetailsBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/04-product-modal.png` });
  console.log('04 done');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
} else {
  console.log('04 skipped - no details button visible');
}

// --- 5. Close modal, click cart icon to go to checkout ---
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);

// Add a product to cart first via "Comprar" button
const buyBtn = page.locator('button', { hasText: 'Comprar' }).first();
if (await buyBtn.isVisible()) {
  await buyBtn.click();
  await page.waitForTimeout(500);
}

// Navigate to checkout
await page.goto('http://localhost:3000/food-fast/checkout', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// --- 6. Checkout top ---
await page.screenshot({ path: `${OUT}/05-checkout-top.png` });
console.log('05 done');

// --- 7. Checkout full page ---
await page.screenshot({ path: `${OUT}/06-checkout-full.png`, fullPage: true });
console.log('06 done');

// --- 8. Desktop view: showcase ---
await context.close();
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dpage = await desktop.newPage();
await dpage.goto('http://localhost:3000/food-fast', { waitUntil: 'networkidle', timeout: 30000 });
await dpage.waitForTimeout(2000);
await dpage.screenshot({ path: `${OUT}/07-showcase-desktop.png` });
console.log('07 done');

await dpage.evaluate(() => window.scrollTo(0, 300));
await dpage.waitForTimeout(500);
await dpage.screenshot({ path: `${OUT}/08-showcase-desktop-grid.png` });
console.log('08 done');

await desktop.close();
await browser.close();
console.log('All screenshots saved to scratch/screenshots/');
