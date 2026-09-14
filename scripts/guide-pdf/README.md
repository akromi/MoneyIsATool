# Markdown guide → PDF

Two guides live at the top of the repository, and both are printed by this
folder. The Markdown is the copy that stays correct.

| Guide | For | Build |
| --- | --- | --- |
| `TECHNICAL-GUIDE.md` | Whoever looks after the site: domains, hosting, keys. | `bash scripts/guide-pdf/build.sh` |
| `TEACHER-GUIDE.md` | A teacher using the calculators, planners and the Challenge in a classroom. | `bash scripts/guide-pdf/build.sh TEACHER-GUIDE.md TEACHER-GUIDE.pdf` |

Both PDFs are ignored by git deliberately: one committed alongside the Markdown
goes stale the first time somebody edits the guide and forgets to regenerate it.
Make one when you need one.

The line under the contents — where the living version of that document is —
comes from the document itself, as an `<!-- note: ... -->` comment near the top.
A guide without one gets the technical guide's wording, which is wrong for
anything else, so write one.

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
