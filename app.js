const express = require("express");
const app = express();
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
require("dotenv").config();

const puppeteer = require("puppeteer");
var { GoogleSpreadsheet } = require("google-spreadsheet");
var creds = require("./creds.json");

function removeLastWord(sentence) {
  const words = sentence.split(" ");
  const withoutLastWord = words.slice(0, -1).join(" ");
  return withoutLastWord;
}

function checkLastWord(lastWord) {
  const regex = /(?=.*[a-zA-Z])(?=.*\d)/; // positive lookahead to match both characters and numbers
  return regex.test(lastWord);
}
function isNumber(char) {
  return !isNaN(parseInt(char));
}

app.get("/", async (req, res) => {
  res.send("hello");
});

app.post("/", async (req, res) => {
  let url = req.body.url;

  url = decodeURIComponent(url);
  console.log({ url });

  var doc = new GoogleSpreadsheet(
    "1cXnNxJFkzuxL0Uk0LpEUYNypuDiEhfWu-l0jY4MRSyI"
  );
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo(); // loads document properties and worksheets

  const sheet = doc.sheetsByIndex[0];

  const browser = await puppeteer.launch({
    headless: false,
    ignoreHTTPSErrors: true,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  try {
    let page = await browser.newPage();
    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });
    // Wait for the page to fully load
    await page.waitForNavigation({ waitUntil: "load" });

    await page.waitForSelector("._44qnta", {
      timeout: 30000,
    });

    const titleElement = await page.$("._44qnta");
    const spanElement = await titleElement.$("span");

    var spanText = await page.evaluate(
      (spanElement) => spanElement.textContent,
      spanElement
    );
    const words = spanText.trim().split(" ");
    const lastWord = words[words.length - 1];
    if (checkLastWord(lastWord)) {
      var sku = lastWord;
      spanText = removeLastWord(spanText);
    }
    console.log({ spanText });
    console.log({ sku });
    const oldPrice = await page.$(".Y3DvsN");
    var oldPriceText = await page.evaluate(
      (oldPrice) => oldPrice.textContent,
      oldPrice
    );

    if (!isNumber(oldPriceText[0])) {
      oldPriceText = oldPriceText.slice(1);
    }
    console.log({ oldPriceText });

    const currentPrice = await page.$(".pqTWkA");
    var currentPriceText = await page.evaluate(
      (currentPrice) => currentPrice.textContent,
      currentPrice
    );

    if (!isNumber(currentPriceText[0])) {
      currentPriceText = currentPriceText.slice(1);
    }

    console.log({ currentPriceText });

    const brand = await page.$(".GvvZVe");
    const brandText = await page.evaluate((brand) => brand.textContent, brand);
    console.log({ brandText });
    await sheet.addRow({
      "Nhãn hàng": brandText,
      "Tên sản phẩm": spanText,
      "Mã SKU": sku,
      "Giá bán Shopee": `${oldPriceText}\n${currentPriceText}`,
      "Link sản phẩm Shopee": `=HYPERLINK("${decodeURIComponent(
        url
      )}"; "Link")`,
    });
    res.send("done");
  } catch (error) {
    console.log({ error });
    res.send(error);
  } finally {
    await browser.close();
  }
});

app.listen(4000, () => {
  console.log("Server started on port 4000");
});
