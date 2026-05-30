const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.text().includes('MANGZHONG DIAGNOSTIC')) {
      console.log('BROWSER LOG:', msg.text());
    } else {
      console.log('BROWSER LOG OTHER:', msg.text());
    }
  });

  console.log('Navigating to http://localhost:3001...');
  try {
    await page.goto('http://localhost:3001');
  } catch (err) {
    console.error('Failed to navigate:', err);
    await browser.close();
    process.exit(1);
  }
  
  // Wait for 5 seconds for page load and initialization
  await page.waitForTimeout(5000);

  // Click the Astro Phenomena Lab button or card to activate it
  console.log('Activating solar terms demo...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('*'));
    const termCard = cards.find(el => el.textContent && el.textContent.includes('二十四节气'));
    if (termCard) {
      termCard.click();
      console.log('Clicked Twenty Four Solar Terms card via text content match');
    } else {
      console.log('Could not find 二十四节气 card, trying to click elements with solar-terms');
      const el = document.querySelector('[id*="solar-terms"]') || document.querySelector('[class*="solar-terms"]');
      if (el) el.click();
    }
  });

  await page.waitForTimeout(2000);

  // Click on the "芒种" button/phase to set selectedSolarTermIndex to 8
  console.log('Selecting Mangzhong...');
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(el => el.textContent && el.textContent.trim() === '芒种');
    if (el) {
      el.click();
      console.log('Clicked 芒种 button');
    } else {
      console.log('Could not find 芒种 button');
    }
  });

  // Wait for a few frames to let the diagnostic log print
  await page.waitForTimeout(3000);

  await browser.close();
  console.log('Browser closed.');
})();
