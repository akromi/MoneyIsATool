"use client";

import { useActionState } from "react";
import { submitLicenceRequest, type RequestState } from "./actions";

export default function RequestForm() {
  const [state, action, pending] = useActionState<RequestState, FormData>(submitLicenceRequest, {});
  if (state.ok) return <div className="notice ok"><strong>Thank you.</strong> We&apos;ll reply by email with a quote and next steps.</div>;
  return (
    <form action={action} className="stack">
      {state.error && <div className="notice err">{state.error}</div>}
      <label>School or board<input name="school" required maxLength={200} /></label>
      <label>Your name<input name="name" required maxLength={120} autoComplete="name" /></label>
      <label>Email<input type="email" name="email" required autoComplete="email" /></label>
      <label>How many teachers need access?<span className="hint">A rough number is fine.</span><input type="number" name="seats" min={1} max={500} inputMode="numeric" /></label>
      <label>Anything else<span className="hint">Courses, grades, timing, purchase-order requirements.</span><textarea name="message" rows={4} maxLength={2000} /></label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999 }} aria-hidden="true" />
      <div><button className="btn" type="submit" disabled={pending}>{pending ? "Sending…" : "Request a quote"}</button></div>
    </form>
  );
}
