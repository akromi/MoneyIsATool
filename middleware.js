/**
 * Beta gate for the calculators site.
 *
 * The same shared password as the book area. Set BETA_PASSWORD on this Vercel
 * project to turn it on, and delete the variable at launch to open the site.
 * The cookie holds a digest rather than the password, so changing the password
 * invalidates every cookie already issued, and the check runs at the edge, so
 * the password never reaches the browser.
 */
import { next } from "@vercel/functions";

const COOKIE = "mit_beta";
const MAX_AGE = 60 * 60 * 24 * 30; // Ask again after a month.

async function token(password) {
  const data = new TextEncoder().encode("moneyisatool-beta:" + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison, so a wrong password reveals nothing by timing. */
function same(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cookieValue(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function page(wrong) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Money Is a Tool — private beta</title>
<style>
:root{color-scheme:light dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eef1ec;color:#1d2419;
  font:15.5px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:24px}
.box{background:#f7f8f4;border:1px solid #d7dbd0;border-radius:14px;padding:28px 26px;max-width:380px;width:100%;
  box-shadow:0 10px 30px -18px rgba(0,0,0,.4)}
h1{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-size:22px;margin:0 0 4px;font-weight:650}
.kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8a6a1f;font-weight:700;margin:0 0 8px}
p{color:#4b5347;margin:0 0 16px}
label{display:block;font-weight:600;font-size:.92rem;margin:0 0 5px}
input{width:100%;box-sizing:border-box;font:inherit;padding:9px 11px;border:1px solid #d9d0a9;
  border-radius:8px;background:#fdf9ea;color:#1d2419}
button{margin-top:12px;width:100%;font:inherit;font-weight:600;padding:10px 16px;border:1px solid #0e6f42;
  border-radius:9px;background:#0e6f42;color:#fff;cursor:pointer}
.err{margin:0 0 12px;padding:9px 12px;border-radius:8px;border:1px solid #a3352a;background:#f7e4e1;color:#7d2820;font-size:.92rem}
@media(prefers-color-scheme:dark){
  body{background:#151a13;color:#e8ebe3}.box{background:#1b2118;border-color:#39412f}
  p{color:#aab3a3}input{background:#1b2318;border-color:#48512f;color:#e8ebe3}
  .err{background:#2b1a18;border-color:#c4564a;color:#f0b7b0}}
</style></head><body>
<form class="box" method="post">
  <div class="kicker">Private beta</div>
  <h1>Money Is a Tool</h1>
  <p>This site is not open to the public yet. Enter the beta password to continue.</p>
  ${wrong ? '<p class="err">That password was not correct.</p>' : ""}
  <label for="p">Beta password</label>
  <input id="p" name="beta_password" type="password" autocomplete="current-password" autofocus required>
  <button type="submit">Enter</button>
</form></body></html>`;
}

const html = (body, status) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

export default async function middleware(request) {
  const password = process.env.BETA_PASSWORD;
  if (!password || !password.trim()) return next();

  const expected = await token(password);
  const held = cookieValue(request, COOKIE);
  if (held && same(held, expected)) return next();

  if (request.method === "POST") {
    const form = await request.formData().catch(() => null);
    const given = String(form?.get("beta_password") ?? "");
    if (given && same(await token(given), expected)) {
      return new Response(null, {
        status: 303,
        headers: {
          location: request.url,
          "set-cookie": `${COOKIE}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return html(page(true), 401);
  }
  return html(page(false), 401);
}

export const config = { matcher: "/((?!_vercel/).*)" };
