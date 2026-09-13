// Print the assembled HTML to PDF with Chromium, via Playwright.
//
// Chromium is used rather than a PDF library because the guide is already
// styled as a web page: the same CSS that lays it out on screen lays it out on
// paper, including the repeated table headers and the page break before each
// section.
const { chromium } = require("playwright");

(async () => {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) {
    console.error("usage: node render.js <input.html> <output.pdf>");
    process.exit(2);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file://" + src, { waitUntil: "load" });

  // Chromium does not support CSS page-margin boxes, so the running footer is
  // given to it as a template instead. Its padding must match the page margin.
  const footer = `<div style="width:100%;font:7.5pt -apple-system,Helvetica,Arial,sans-serif;
      color:#8d9488;padding:0 0.75in;display:flex;justify-content:space-between">
    <span>Money Is a Tool — technical guide · kept current at TECHNICAL-GUIDE.md in the repository</span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;

  await page.pdf({
    path: out,
    format: "Letter",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: footer,
    margin: { top: "0.7in", bottom: "0.75in", left: "0.75in", right: "0.75in" },
    tagged: true,
    outline: true, // Section bookmarks, for reading it on screen.
  });

  await browser.close();
  console.log("wrote " + out);
})();
