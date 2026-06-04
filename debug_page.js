import { chromium } from 'playwright';

async function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function run() {
  log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[${new Date().toISOString()}] [BROWSER CONSOLE ${type.toUpperCase()}]: ${text}`);
  });

  page.on('pageerror', err => {
    console.error(`[${new Date().toISOString()}] [BROWSER UNCAUGHT EXCEPTION]: ${err.stack || err.message || err}`);
  });

  log('Navigating to http://localhost:3001/ ...');
  try {
    // Increased timeout to 45 seconds to differentiate between slow loading and actual lockup
    await page.goto('http://localhost:3001/', { timeout: 45000, waitUntil: 'load' });
    log('Navigation complete. Waiting for loading screen to reach 100%...');
    
    // Wait for the Launch button to appear
    await page.waitForSelector('button:has-text("LAUNCH"), button:has-text("点击发射")', { timeout: 30000 });
    log('Launch button visible. Clicking launch...');
    await page.click('button:has-text("LAUNCH"), button:has-text("点击发射")');
    
    // Wait 2 seconds for entry animation to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    log('Entered simulation. Current URL: ' + page.url());
    
    // Open settings panel
    log('Opening System Settings panel...');
    await page.click('button[title="System Settings"], button[title="系统设置"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Select Earth
    log('Selecting Planet Earth...');
    await page.selectOption('select:nth-of-type(1)', 'planet');
    await page.selectOption('select:nth-of-type(2)', 'earth');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click Land on Earth button
    log('Clicking Land on Earth button to enter Starry Sky mode...');
    await page.waitForSelector('#btn-login-land-planet', { timeout: 5000 });
    await page.click('#btn-login-land-planet');

    log('Transitioning to Starry Sky mode. Waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check responsiveness
    log('Checking responsiveness in Starry Sky mode...');
    let res = await page.evaluate(() => 1 + 1);
    log(`Responsive check 1: ${res}`);

    // Click Leave Earth button (same button) to return to Universe mode
    log('Clicking button to return to Universe mode...');
    await page.click('#btn-login-land-planet');

    log('Transitioning back to Universe mode. Waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check responsiveness again
    log('Checking responsiveness in Universe mode...');
    res = await page.evaluate(() => 1 + 1);
    log(`Responsive check 2: ${res}`);

  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error or hang during execution: ${err.message || err}`);
  } finally {
    log('Closing browser...');
    await browser.close();
  }
}

run().catch(err => {
  console.error('Script failed:', err);
});
