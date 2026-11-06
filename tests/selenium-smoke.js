// Selenium browser smoke test. Run with app server and Chrome/ChromeDriver available.
const { Builder, By, until } = require("selenium-webdriver");
(async function shoppingSmokeTest() {
  const driver = await new Builder().forBrowser("chrome").build();
  try {
    await driver.get(process.env.BASE_URL || "http://localhost:3000");
    await driver.wait(until.titleIs("ShopEase | Online Shopping"), 10000);
    await driver.wait(until.elementLocated(By.css(".product")), 10000);
    console.log("Selenium smoke test passed: catalogue loaded");
  } finally { await driver.quit(); }
})().catch(err => { console.error(err); process.exit(1); });
