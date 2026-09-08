/**
 * Beta gate.
 *
 * While the site is in beta the whole thing sits behind one shared password.
 * Set BETA_PASSWORD to turn it on; delete the variable to open the site at
 * launch. Nothing else has to change.
 *
 * The cookie holds a digest of the password rather than the password itself,
 * so changing BETA_PASSWORD immediately invalidates every cookie already
 * issued. The check happens on the server, so the password is never sent to
 * the browser.
 */

const COOKIE = "mit_beta";
const MAX_AGE = 60 * 60 * 24 * 30; // Ask again after a month.

export function betaPassword(): string | null {
  const p = process.env.BETA_PASSWORD;
  return p && p.trim() ? p : null;
}

export async function betaToken(password: string): Promise<string> {
  const data = new TextEncoder().encode("moneyisatool-beta:" + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison, so a wrong password reveals nothing by timing. */
export function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const betaCookieName = COOKIE;
export const betaCookieMaxAge = MAX_AGE;

export function betaPage(wrong: boolean): string {
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
