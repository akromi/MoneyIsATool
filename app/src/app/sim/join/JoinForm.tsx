"use client";

import { useActionState } from "react";
import { joinClass } from "../actions";
import type { SimState } from "../actions";

export default function JoinForm() {
  const [state, action, pending] = useActionState<SimState, FormData>(joinClass, {});
  return (
    <form action={action} className="stack">
      {state.error && <div className="notice err">{state.error}</div>}
      <label>
        Class code
        <span className="hint">Six characters, from your teacher.</span>
        <input name="code" required autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ABC234" />
      </label>
      <label>
        Your name
        <span className="hint">Exactly as your teacher entered it on the class list.</span>
        <input name="name" required autoComplete="off" placeholder="Jordan L." />
      </label>
      <label>
        Your passcode
        <input name="passcode" required autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="K7PQR2" />
      </label>
      <div><button className="btn" type="submit" disabled={pending}>{pending ? "Checking…" : "Join the class"}</button></div>
      <p className="faint">
        We do not ask for your email address, and we never ask for real money details — no bank account, no SIN,
        no CRA login. The household profile you build in this game is made up on purpose.
      </p>
    </form>
  );
}
