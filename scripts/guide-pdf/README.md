# Technical guide → PDF

The guide itself is `TECHNICAL-GUIDE.md` at the top of the repository. That is
the copy that stays correct. This folder only makes a printable version of it.

```
bash scripts/guide-pdf/build.sh
```

That writes `TECHNICAL-GUIDE.pdf`, ignored by git deliberately: a PDF committed
alongside the Markdown goes stale the first time somebody edits the guide and
forgets to regenerate it. Make one when you need one.

The first run installs Playwright into this folder, and downloads Chromium if
the machine has no copy. Later runs take a couple of seconds.

## What the pieces do

| File | Does |
| --- | --- |
| `md2html.js` | Turns the Markdown into one HTML page. Covers only what the guide uses: headings, paragraphs, tables, lists, rules, and inline code, bold, italic and links. |
| `guide.css` | How it prints. Section per page, repeated table headers, the site's colours. |
| `render.js` | Prints that page to PDF with Chromium, adding the running footer and page numbers. |

Nothing in this folder reaches either website: the calculators build publishes
a fixed list of files that excludes `scripts/`, and the package.json here is
separate from the one at the root so Playwright never becomes a site
dependency.
