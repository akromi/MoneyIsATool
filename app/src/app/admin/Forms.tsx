"use client";

import { useActionState } from "react";
import { createLicence, upsertResource, type AdminState } from "./actions";

export function LicenceForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(createLicence, {});
  return (
    <form action={action} className="stack">
      {state.error && <div className="notice err">{state.error}</div>}
      {state.ok && <div className="notice ok">{state.ok}</div>}
      <label>School or board<input name="school" required /></label>
      <label>Administrator email<span className="hint">The person who will invite teachers. They become a member without using a seat.</span><input type="email" name="admin_email" required /></label>
      <div className="row">
        <label style={{ flex: 1 }}>Teacher seats<input type="number" name="seats" min={1} max={1000} defaultValue={10} required /></label>
        <label style={{ flex: 1 }}>Expires<span className="hint">Leave blank for perpetual.</span><input type="date" name="expires" /></label>
      </div>
      <label>Notes<span className="hint">Invoice or PO number, contact details.</span><input name="notes" /></label>
      <label className="row" style={{ display: "flex" }}><input type="checkbox" name="send_link" defaultChecked style={{ width: "auto" }} /> Email the administrator a sign-in link now</label>
      <div><button className="btn" type="submit" disabled={pending}>{pending ? "Creating…" : "Create licence"}</button></div>
    </form>
  );
}

export function ResourceForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(upsertResource, {});
  return (
    <form action={action} className="stack">
      {state.error && <div className="notice err">{state.error}</div>}
      {state.ok && <div className="notice ok">{state.ok}</div>}
      <div className="row">
        <label style={{ flex: 1 }}>Slug<span className="hint">Stable id used in the download link, e.g. <code>book</code>.</span><input name="slug" required pattern="[a-z0-9-]{2,60}" /></label>
        <label style={{ flex: 1 }}>Audience<select name="audience" defaultValue="book"><option value="book">Book (individuals + schools)</option><option value="teacher">Teacher Resources (schools only)</option></select></label>
      </div>
      <label>Title<input name="title" required /></label>
      <label>Description<input name="description" /></label>
      <label>Storage path<span className="hint">Object key inside the private <code>resources</code> bucket, e.g. <code>book/money-is-a-tool-2026.pdf</code>. Upload the file in Supabase → Storage first. To replace a file later, upload the new one over the same path.</span><input name="storage_path" required /></label>
      <div className="row">
        <label style={{ flex: 2 }}>Download file name<span className="hint">Optional; defaults to the file&apos;s own name.</span><input name="file_name" /></label>
        <label style={{ flex: 1 }}>Sort order<input type="number" name="sort_order" defaultValue={100} /></label>
      </div>
      <div><button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : "Save resource"}</button></div>
    </form>
  );
}
