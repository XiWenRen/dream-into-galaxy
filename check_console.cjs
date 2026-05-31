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
  
  // Wait for 9 seconds for page load, entry animation (6.5s) and initialization to complete
  console.log('Waiting for entry animation to complete (9s)...');
  await page.waitForTimeout(9000);

  // Click the Astro button (which has telescope emoji 🔭) to open the Astro Phenomena Panel
  console.log('Opening Astro Phenomena Panel...');
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button'));
    const astroBtn = els.find(el => el.textContent && (el.textContent.includes('🔭') || el.textContent.includes('天文') || el.textContent.includes('Astro')));
    if (astroBtn) {
      astroBtn.click();
      console.log('Clicked Astro button');
    } else {
      console.log('Could not find Astro button');
    }
  });

  await page.waitForTimeout(1500);

  // Click the Astro Phenomena Card (Solar Terms / 二十四节气)
  console.log('Activating solar terms demo...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const termCard = buttons.find(el => el.textContent && (el.textContent.includes('二十四节气') || el.textContent.includes('Solar Terms') || el.textContent.includes('📅')));
    if (termCard) {
      termCard.click();
      console.log('Clicked Solar Terms card');
    } else {
      console.log('Could not find Solar Terms card');
    }
  });

  await page.waitForTimeout(3000);

  // Click on the "芒种" or "Grain in Ear" button/phase to set selectedSolarTermIndex to 8
  console.log('Selecting Mangzhong...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const el = buttons.find(el => el.textContent && (el.textContent.trim() === '芒种' || el.textContent.trim() === 'Grain in Ear'));
    if (el) {
      el.click();
      console.log('Clicked Mangzhong / Grain in Ear button');
    } else {
      console.log('Could not find Mangzhong / Grain in Ear button, trying text search across all elements');
      const allEls = Array.from(document.querySelectorAll('*'));
      const textEl = allEls.find(el => el.textContent && (el.textContent.trim() === '芒种' || el.textContent.trim() === 'Grain in Ear'));
      if (textEl && typeof textEl.click === 'function') {
        textEl.click();
        console.log('Clicked Mangzhong / Grain in Ear text element');
      } else {
        console.log('Still could not find Mangzhong button');
      }
    }
  });

  // Wait for a few frames to let the diagnostic log print
  console.log('Waiting for frames to render and print diagnostic logs...');
  await page.waitForTimeout(5000);

  await browser.close();
  console.log('Browser closed.');
})();
