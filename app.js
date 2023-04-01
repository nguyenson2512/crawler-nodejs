const express = require("express");
const app = express();
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const puppeteer = require("puppeteer");
var { GoogleSpreadsheet } = require("google-spreadsheet");
var creds = require("./creds.json");

// let url =
// "https://shopee.vn/%C4%90%E1%BA%A7m-c%C3%B4ng-s%E1%BB%9F-CITI-MODE-FASHION-d%C3%A1ng-xo%C3%A8-k%E1%BA%BB-%C4%91%E1%BB%8F-peplum-ph%E1%BB%91i-c%C3%BAc-s%C6%B0%E1%BB%9Dn-ch%C3%A2n-v%C3%A1y-%C4%91en-DH3647-i.822377674.18736542242?fbclid=IwAR1cSVJBR_OfDF__9-a1RpP6w1Ui-pIHsEpCGBUchxIdS-XvwTMx78Fvw9k";

// let url =
//   "https://levunguyen.com/cauhoi/2020/06/17/cau-hoi-phong-van-lap-trinh-angular/";
async function run(url) {
  url = decodeURIComponent(url);
  console.log({ url });
  // First, we must launch a browser instance
  // print html content of the website
  // console.log(await page.content());

  var doc = new GoogleSpreadsheet(
    "1cXnNxJFkzuxL0Uk0LpEUYNypuDiEhfWu-l0jY4MRSyI"
  );
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo(); // loads document properties and worksheets

  const sheet = doc.sheetsByIndex[0];

  const browser = await puppeteer.launch({
    // Headless option allows us to disable visible GUI, so the browser runs in the "background"
    // for development lets keep this to true so we can see what's going on but in
    // on a server we must set this to true
    headless: true,
    // This setting allows us to scrape non-https websites easier
    ignoreHTTPSErrors: true,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath: puppeteer.executablePath(),
  });
  // then we need to start a browser tab
  let page = await browser.newPage();
  // and tell it to go to some URL
  await page.goto(url, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("._44qnta");

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

  // close everything
  await page.close();
  await browser.close();

  await sheet.addRow({
    "Nhãn hàng": brandText,
    "Tên sản phẩm": spanText,
    "Mã SKU": sku,
    "Giá bán Shopee": `${oldPriceText}\n${currentPriceText}`,
    "Link sản phẩm Shopee": `=HYPERLINK("${decodeURIComponent(url)}"; "Link")`,
  });
}

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
  const url = req.body.url;
  try {
    await run(url);
  } catch (error) {
    res.send("error");
  }
  res.send("done");
});

app.listen(4000, () => {
  console.log("Server started on port 4000");
});
