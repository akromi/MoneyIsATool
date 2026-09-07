"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});
  if (state.ok) {
    return (
      <div className="notice ok">
        <strong>Check your email.</strong> We sent a sign-in link to <b>{state.email}</b>. It expires in an hour. If it doesn&apos;t arrive, check your spam folder or try again.
      </div>
    );
  }
  return (
    <form action={action} className="stack">
      {state.error && <div className="notice err">{state.error}</div>}
      <label>
        Email address
        <span className="hint">Use the email you purchased with, or that your school invited.</span>
        <input type="email" name="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" />
      </label>
      <input type="hidden" name="next" value={next} />
      <div><button className="btn" type="submit" disabled={pending}>{pending ? "Sending…" : "Email me a sign-in link"}</button></div>
      <p className="faint">No password to remember: each sign-in link is single-use and only works in the browser that receives it.</p>
    </form>
  );
}
