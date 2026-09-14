// Markdown -> HTML for TECHNICAL-GUIDE.md. Deliberately covers only the
// constructs the guide actually uses: headings, paragraphs, tables, ordered
// and unordered lists, rules, and inline code/bold/italic/links.
const fs = require("fs");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const SENT = ""; // Private-use marker; cannot occur in the source text.

/** Code spans are lifted out first so their contents escape the other rules. */
function inline(s) {
  const code = [];
  let t = s.replace(/`([^`]+)`/g, (_, c) => SENT + (code.push(c) - 1) + SENT);
  t = esc(t);
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, txt, href) => `<a href="${href}">${txt}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>");
  return t.replace(new RegExp(SENT + "(\\d+)" + SENT, "g"), (_, i) => `<code>${esc(code[+i])}</code>`);
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function convert(md) {
  const lines = md.split("\n");
  const out = [];
  const toc = [];
  let i = 0;
  let firstSection = true;
  const para = [];

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Table: a run of lines beginning with a pipe.
    if (/^\|/.test(line)) {
      flushPara();
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i].replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
        i++;
      }
      const hasRule = rows[1] && rows[1].every((c) => /^:?-{2,}:?$/.test(c));
      let head = null;
      if (hasRule) { head = rows.shift(); rows.shift(); }
      // The lead column is what gets looked up, so how much room it deserves
      // depends on how many columns share the measure with it.
      const cols = (head || rows[0] || []).length;
      out.push(`<table class="cols-${cols}">`);
      if (head) out.push(`<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>`);
      out.push("<tbody>");
      for (const r of rows) out.push(`<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`);
      out.push("</tbody></table>");
      continue;
    }

    // Lists: a run of same-kind items. No nesting is used in this document.
    const isOl = /^\d+\.\s+/.test(line);
    const isUl = /^[-*]\s+/.test(line);
    if (isOl || isUl) {
      flushPara();
      const tag = isOl ? "ol" : "ul";
      const items = [];
      while (i < lines.length) {
        const m = isOl ? /^\d+\.\s+(.*)$/.exec(lines[i]) : /^[-*]\s+(.*)$/.exec(lines[i]);
        if (m) { items.push(m[1]); i++; continue; }
        // A wrapped continuation line is indented; fold it into the last item.
        if (/^\s+\S/.test(lines[i]) && items.length) { items[items.length - 1] += " " + lines[i].trim(); i++; continue; }
        break;
      }
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`);
      continue;
    }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      const level = h[1].length;
      const text = h[2];
      const id = slug(text);
      if (level === 1) {
        out.push(`<h1>${inline(text)}</h1>`);
      } else if (level === 2) {
        toc.push({ id, text });
        // Each numbered section starts a fresh page, so the printed guide can
        // be flipped through by section the way a manual is.
        out.push(`<h2 id="${id}"${firstSection ? ' class="first"' : ""}>${inline(text)}</h2>`);
        firstSection = false;
      } else {
        out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      }
      i++;
      continue;
    }

    if (/^---+$/.test(line)) {
      flushPara();
      // A rule immediately before a section heading is redundant once that
      // section begins on its own page.
      const nextReal = lines.slice(i + 1).find((l) => l.trim() !== "");
      if (!/^##\s/.test(nextReal || "")) out.push("<hr>");
      i++;
      continue;
    }

    if (line.trim() === "") { flushPara(); i++; continue; }

    para.push(line.trim());
    i++;
  }
  flushPara();
  return { body: out.join("\n"), toc };
}

const raw = fs.readFileSync(process.argv[2], "utf8");

/* The line under the contents says where the living version of this document
   is, which differs per document — so the document says it, rather than the
   converter assuming. Written as an HTML comment so it stays invisible
   anywhere else the Markdown is read. */
const noteMatch = raw.match(/<!--\s*note:\s*([\s\S]*?)-->/);
const note = noteMatch
  ? noteMatch[1].trim().replace(/\s+/g, " ")
  : "A printed copy. The version that is kept up to date is `TECHNICAL-GUIDE.md` in the repository — check there before following anything that looks out of date.";
const md = raw.replace(/<!--\s*note:[\s\S]*?-->/, "");
const { body, toc } = convert(md);
const css = fs.readFileSync(__dirname + "/guide.css", "utf8");

// The contents block sits between the introduction and the first section.
const contents = `<nav class="toc"><h2 class="tochead">Contents</h2><ol>
${toc.map((t) => `<li><a href="#${t.id}">${esc(t.text.replace(/^\d+\.\s*/, ""))}</a></li>`).join("\n")}
</ol>
<p class="note">${inline(esc(note))}</p></nav>
`;
const anchor = body.indexOf('<h2 id=');
if (anchor < 0) throw new Error("no section heading found; contents block has nowhere to go");
const withContents = body.slice(0, anchor) + contents + body.slice(anchor);

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Money Is a Tool — technical guide</title>
<style>${css}</style></head><body>
${withContents}
</body></html>`;

fs.writeFileSync(process.argv[3], html);
console.log(`${toc.length} sections, ${html.length} bytes`);
