const { chromium } = require('C:/Users/matheus.soares/AppData/Local/Temp/node_modules/playwright-chromium');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function addToCartViaJS(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#__nuxt')?.__vue_app__;
    if (!app) return 'no app';
    const pinia = app.config.globalProperties.$pinia;
    if (!pinia) return 'no pinia';
    let cartStore = null;
    for (const [key, store] of pinia._s) {
      if (key.includes('cart') || key.includes('Cart')) { cartStore = store; break; }
    }
    if (!cartStore) return 'no cart store';
    // CartItem shape: { product: Product, quantity: number, selectedSpecs: Record<string, string|string[]> }
    const cartItem = {
      product: {
        id: 'demo-product-1',
        storeId: '93a3bd6f-0a38-4d90-b9d1-ef0e808eb311',
        categoryId: null,
        categoryName: 'Mais Vendidos',
        name: 'Combo Smash Classic',
        description: 'Pão brioche, 2 blends smash de 80g, queijo cheddar',
        price: 34.90,
        promoPrice: 29.90,
        highlighted: true,
        imageUrls: ['https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=400'],
        specifications: [],
        variationOptions: {},
        stock: 100,
        active: true
      },
      quantity: 2,
      selectedSpecs: {}
    };
    cartStore.addItem(cartItem);
    return 'added';
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // --- Mobile view ---
  const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mPage = await mCtx.newPage();

  await mPage.goto('http://localhost:3000/food-fast', { waitUntil: 'networkidle', timeout: 30000 });
  await mPage.waitForTimeout(2500);

  // 1. Full showcase page
  await mPage.screenshot({ path: path.join(OUT, '01-showcase-full.png'), fullPage: true });
  console.log('01-showcase-full done');

  // 2. Top of page (header + hero)
  await mPage.evaluate(() => window.scrollTo(0, 0));
  await mPage.screenshot({ path: path.join(OUT, '02-showcase-top.png') });
  console.log('02-showcase-top done');

  // 3. Category tabs
  await mPage.evaluate(() => window.scrollTo(0, 220));
  await mPage.waitForTimeout(300);
  await mPage.screenshot({ path: path.join(OUT, '03-category-tabs.png') });
  console.log('03-category-tabs done');

  // 4. Product cards grid
  await mPage.evaluate(() => window.scrollTo(0, 420));
  await mPage.waitForTimeout(400);
  await mPage.screenshot({ path: path.join(OUT, '04-product-cards.png') });
  console.log('04-product-cards done');

  // 5. Open ProductDetailsModal via JS click
  await mPage.evaluate(() => window.scrollTo(0, 400));
  await mPage.waitForTimeout(300);
  const detailsBtn = mPage.locator('button', { hasText: 'Detalhes' }).first();
  if (await detailsBtn.count() > 0) {
    await detailsBtn.evaluate(el => el.click());
    await mPage.waitForTimeout(900);
    await mPage.screenshot({ path: path.join(OUT, '05-product-modal-mobile.png') });
    console.log('05-product-modal-mobile done');
    // Close modal via JS
    await mPage.evaluate(() => {
      const overlay = document.querySelector('.fixed.inset-0.z-50');
      if (overlay) {
        const closeBtn = overlay.querySelector('button');
        if (closeBtn) closeBtn.click();
      }
    });
    await mPage.waitForTimeout(500);
  }

  // 6. Add to cart via Pinia injection + screenshot header badge
  const added = await addToCartViaJS(mPage);
  console.log('Cart injection:', added);
  await mPage.evaluate(() => window.scrollTo(0, 0));
  await mPage.waitForTimeout(400);
  await mPage.screenshot({ path: path.join(OUT, '06-header-with-cart-badge.png') });
  console.log('06-header-with-cart-badge done');

  // 7. Checkout page with items
  await mPage.goto('http://localhost:3000/food-fast/checkout', { waitUntil: 'networkidle', timeout: 30000 });
  await mPage.waitForTimeout(2000);
  // Try adding to cart again after navigation (store may reset)
  await addToCartViaJS(mPage);
  await mPage.waitForTimeout(400);
  await mPage.screenshot({ path: path.join(OUT, '07-checkout-top.png') });
  console.log('07-checkout-top done');

  await mPage.screenshot({ path: path.join(OUT, '08-checkout-full.png'), fullPage: true });
  console.log('08-checkout-full done');

  await mPage.evaluate(() => window.scrollTo(0, 400));
  await mPage.waitForTimeout(300);
  await mPage.screenshot({ path: path.join(OUT, '09-checkout-form.png') });
  console.log('09-checkout-form done');

  await mCtx.close();

  // --- Desktop view ---
  const dCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dPage = await dCtx.newPage();
  await dPage.goto('http://localhost:3000/food-fast', { waitUntil: 'networkidle', timeout: 30000 });
  await dPage.waitForTimeout(2500);

  // 10. Desktop hero
  await dPage.screenshot({ path: path.join(OUT, '10-showcase-desktop-hero.png') });
  console.log('10-showcase-desktop-hero done');

  // 11. Desktop product grid
  await dPage.evaluate(() => window.scrollTo(0, 450));
  await dPage.waitForTimeout(400);
  await dPage.screenshot({ path: path.join(OUT, '11-showcase-desktop-grid.png') });
  console.log('11-showcase-desktop-grid done');

  // 12. Desktop modal
  const dBtn = dPage.locator('button', { hasText: 'Detalhes' }).first();
  if (await dBtn.count() > 0) {
    await dBtn.evaluate(el => el.click());
    await dPage.waitForTimeout(900);
    await dPage.screenshot({ path: path.join(OUT, '12-modal-desktop.png') });
    console.log('12-modal-desktop done');
  }

  // 13. Desktop checkout
  await dPage.goto('http://localhost:3000/food-fast/checkout', { waitUntil: 'networkidle', timeout: 30000 });
  await dPage.waitForTimeout(2000);
  await dPage.screenshot({ path: path.join(OUT, '13-checkout-desktop.png') });
  console.log('13-checkout-desktop done');

  await dCtx.close();
  await browser.close();
  console.log('\nAll screenshots saved to', OUT);
})();
