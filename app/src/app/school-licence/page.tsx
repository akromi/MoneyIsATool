import Shell from "@/components/Shell";
import RequestForm from "./RequestForm";

export default function SchoolLicencePage() {
  return (
    <Shell current="school">
      <div className="hero">
        <div className="kicker">Schools</div>
        <h1>License Money Is a Tool for your school</h1>
        <p className="muted">One licence covers a set number of teacher accounts. Each teacher gets the digital book and the full Teacher Resources under their own sign-in, managed by your school.</p>
      </div>
      <div className="grid">
        <section className="card">
          <h2>What&apos;s included</h2>
          <ul className="list">
            <li>Digital edition of the book for every licensed teacher</li>
            <li>Classroom PowerPoint</li>
            <li>Teacher Guide and Flexible Implementation Guide</li>
            <li>Test and question bank</li>
            <li>Other educator resources as they are added</li>
            <li>Free Financial Decision Tools for students at moneyisatool.ca</li>
          </ul>
          <h3>How it works</h3>
          <ol className="list">
            <li>Tell us about your school below. We reply with a quote and invoice (purchase orders welcome).</li>
            <li>We set up the licence and email your administrator a sign-in link.</li>
            <li>Your administrator shares an invite link; each teacher signs in with their own email and takes a seat.</li>
          </ol>
        </section>
        <section className="card"><h2>Request a quote</h2><RequestForm /></section>
      </div>
    </Shell>
  );
}
