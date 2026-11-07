const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

(async function shoppingSmokeTest() {
  const options = new chrome.Options();
  options.addArguments("--headless=new");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--no-sandbox");
  options.addArguments("--window-size=1920,1080");

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    await driver.get(process.env.BASE_URL || "http://localhost:3000");
    await driver.wait(
      until.titleIs("ShopEase | Online Shopping"),
      10000
    );
    await driver.wait(
      until.elementLocated(By.css(".product")),
      10000
    );

    console.log("Selenium smoke test passed: catalogue loaded");
  } finally {
    await driver.quit();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
