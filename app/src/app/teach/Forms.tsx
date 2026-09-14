"use client";

import { useActionState, useState } from "react";
import { addStudent, createClass, resetPasscode, setPrices, type TeachState } from "./actions";

/** Copies the joining instructions, for pasting into a class post or an email. */
export function CopyButton({ text, label = "Copy the instructions" }: { text: string; label?: string }) {
  const [said, setSaid] = useState("");
  return (
    <button
      className="btn secondary small"
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setSaid("Copied");
        } catch {
          // Clipboard access can be refused outright. Say so rather than
          // appearing to have worked: the text is on the page to be selected.
          setSaid("Select the text above and copy it");
        }
        setTimeout(() => setSaid(""), 4000);
      }}
    >
      {said || label}
    </button>
  );
}

export function NewClassForm() {
  const [state, action, pending] = useActionState<TeachState, FormData>(createClass, {});
  return (
    <form action={action} className="stack">
      {state.error && <div className="notice err">{state.error}</div>}
      {state.ok && <div className="notice ok">{state.ok}</div>}
      <div className="row">
        <label style={{ flex: 2 }}>
          Class name
          <input name="name" required placeholder="Grade 11 Financial Literacy — Period 3" />
        </label>
        <label style={{ flex: 1 }}>
          Starting amount each
          <input name="cash" defaultValue="25000" inputMode="decimal" />
        </label>
      </div>
      <div><button className="btn" type="submit" disabled={pending}>{pending ? "Creating…" : "Create the class"}</button></div>
    </form>
  );
}

export function AddStudentForm({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState<TeachState, FormData>(addStudent, {});
  return (
    <form action={action} className="stack">
      {state.error && <div className="notice err">{state.error}</div>}
      {state.ok && <div className="notice ok">{state.ok}</div>}
      <input type="hidden" name="class_id" value={classId} />
      <div className="row">
        <label style={{ flex: 1 }}>
          Student name
          <span className="hint">However you want it to appear. No email address is collected.</span>
          <input name="name" required placeholder="Jordan L." />
        </label>
        <div style={{ alignSelf: "end" }}>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Adding…" : "Add to class"}</button>
        </div>
      </div>
    </form>
  );
}

export function ResetPasscodeForm({ classId, studentId }: { classId: string; studentId: string }) {
  const [state, action, pending] = useActionState<TeachState, FormData>(resetPasscode, {});
  return (
    <form action={action}>
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="student_id" value={studentId} />
      <button className="linkish" type="submit" disabled={pending}>{pending ? "…" : "Reset passcode"}</button>
      {state.ok && <div className="notice ok" style={{ marginTop: 6 }}>{state.ok}</div>}
      {state.error && <div className="notice err" style={{ marginTop: 6 }}>{state.error}</div>}
    </form>
  );
}

export function PriceForm({
  instruments,
  previous,
  today,
}: {
  instruments: { id: string; symbol: string; name: string }[];
  previous: Record<string, { close: number; as_of: string; source: string } | undefined>;
  today: string;
}) {
  const [state, action, pending] = useActionState<TeachState, FormData>(setPrices, {});
  /* A refused save hands back what was typed. Keying the form on it remounts
     these uncontrolled inputs with the figures still in them, so "tick the box
     and save again" does not mean entering the whole day a second time. */
  const kept = state.entered;
  return (
    <form action={action} className="stack" key={kept ? JSON.stringify(kept) : "fresh"}>
      {state.error && <div className="notice err">{state.error}</div>}
      {state.ok && <div className="notice ok">{state.ok}</div>}
      <label style={{ maxWidth: 220 }}>
        Trading day
        <span className="hint">The day these closes are from, not the day you are typing.</span>
        <input type="date" name="as_of" defaultValue={kept?.as_of || today} max={today} required />
      </label>
      <div className="tablewrap">
        <table>
          <thead>
            <tr><th>Instrument</th><th>Held now</th><th>Closing price</th></tr>
          </thead>
          <tbody>
            {instruments.map((i) => {
              const last = previous[i.id];
              return (
                <tr key={i.id}>
                  <td><b>{i.symbol}</b><br /><span className="faint">{i.name}</span></td>
                  <td className="faint">
                    {last ? <>${last.close.toFixed(2)}<br />{last.as_of} · {last.source === "manual" ? "typed in" : "generated"}</> : "—"}
                  </td>
                  <td>
                    <input
                      name={`price_${i.id}`}
                      inputMode="decimal"
                      placeholder="leave blank to skip"
                      aria-label={`Closing price for ${i.symbol}`}
                      defaultValue={kept?.prices?.[i.id] ?? ""}
                      style={{ maxWidth: 160 }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* No wrapping: the sentence is long enough that a wrapping row leaves the
          box stranded on a line of its own, above text it no longer looks
          attached to. */}
      <label className="row" style={{ alignItems: "flex-start", gap: 8, flexWrap: "nowrap" }}>
        <input type="checkbox" name="allow_large_move" defaultChecked={kept?.allowLargeMove} style={{ flex: "none", marginTop: 3 }} />
        <span className="faint">Yes, a price really has moved by more than half since the last one held.</span>
      </label>
      <label className="row" style={{ alignItems: "flex-start", gap: 8, flexWrap: "nowrap" }}>
        <input type="checkbox" name="replace_existing" defaultChecked={kept?.replaceExisting} style={{ flex: "none", marginTop: 3 }} />
        <span className="faint">
          Replace a close another teacher already entered for this day. Every class uses these, so check yours
          against theirs first.
        </span>
      </label>
      <div><button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : "Save the closing prices"}</button></div>
    </form>
  );
}
