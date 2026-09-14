"use client";

import { useActionState } from "react";
import { addStudent, createClass, resetPasscode, type TeachState } from "./actions";

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
