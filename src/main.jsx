import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const questions = [
  { id: "age", title: "How old are you?", options: ["Under 18", "18–44", "45–54", "55–64", "65+"] },
  { id: "work_status", title: "Are you currently able to work?", options: ["Yes, full time", "Yes, part time", "No, I cannot work", "I can work with limitations"] },
  { id: "condition", title: "Does a medical condition currently limit your ability to work?", options: ["Yes", "No", "Not sure"] },
  { id: "duration", title: "How long has your condition affected your ability to work?", options: ["Less than 6 months", "6–12 months", "1–2 years", "More than 2 years"] },
  { id: "applied", title: "Have you already applied for disability benefits?", options: ["No, not yet", "Yes, waiting for a decision", "Yes, I was denied", "Yes, I am appealing"] },
  { id: "representation", title: "Do you currently have an attorney or representative helping you?", options: ["No", "Yes"] }
];

function getEventId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function getCookie(name) {
  return document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1] || "";
}

function trackMeta(eventName, eventId, customData = {}) {
  window.fbq?.("track", eventName, customData, { eventID: eventId });
}

export default function App() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [lead, setLead] = useState({ firstName: "", lastName: "", email: "", phone: "", consent: false });
  const [status, setStatus] = useState("idle");
  const [submitted, setSubmitted] = useState(false);
  const [eventId] = useState(getEventId);
  const total = questions.length + 1;
  const progress = Math.round(((step + 1) / total) * 100);

  useEffect(() => {
    trackMeta("PageView", getEventId());
  }, []);

  const current = questions[step];
  const canContinue = current ? Boolean(answers[current.id]) : Boolean(lead.firstName && lead.email && lead.phone && lead.consent);

  const choose = (value) => {
    setAnswers((a) => ({ ...a, [current.id]: value }));
    trackMeta("LeadStepCompleted", getEventId(), { step: current.id, value });
  };

  const next = () => {
    if (!canContinue) return;
    if (step < questions.length) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const back = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canContinue) return;
    setStatus("sending");

    const payload = {
      eventId,
      lead,
      answers,
      pageUrl: window.location.href,
      fbp: getCookie("_fbp"),
      fbc: getCookie("_fbc"),
      utm: Object.fromEntries(new URLSearchParams(window.location.search))
    };

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": eventId },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Lead API failed");
      setStatus("success");
      setSubmitted(true);
      trackMeta("Lead", eventId, { content_name: "Eligibility Check" });
    } catch {
      setStatus("error");
      trackMeta("LeadSubmitError", getEventId(), { source_event_id: eventId });
    }
  };

  const headline = useMemo(() => {
    if (step === questions.length) return "Where should we send your results?";
    return "See if you may qualify";
  }, [step]);

  if (submitted) {
    return (
      <main className="page">
        <section className="card success-card">
          <div className="check">✓</div>
          <h1>Thanks — your information was received.</h1>
          <p>A member of the team can review your answers and follow up with next steps.</p>
          <small>Your submission was securely routed for processing.</small>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">Eligibility Check</div>
          <span>Free • No obligation</span>
        </header>

        <section className="card">
          <div className="progress-wrap">
            <div className="progress-label"><span>Step {step + 1} of {total}</span><span>{progress}%</span></div>
            <div className="progress"><div style={{ width: `${progress}%` }} /></div>
          </div>

          <p className="eyebrow">60-second eligibility check</p>
          <h1>{headline}</h1>
          <p className="sub">Answer a few simple questions. There is no cost to complete this check.</p>

          {current ? (
            <div className="options">
              {current.options.map((option) => (
                <button
                  key={option}
                  className={`option ${answers[current.id] === option ? "selected" : ""}`}
                  onClick={() => choose(option)}
                >
                  <span>{option}</span><span>›</span>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={submit} className="lead-form">
              <div className="grid">
                <label>First name<input value={lead.firstName} onChange={(e) => setLead({ ...lead, firstName: e.target.value })} autoComplete="given-name" /></label>
                <label>Last name<input value={lead.lastName} onChange={(e) => setLead({ ...lead, lastName: e.target.value })} autoComplete="family-name" /></label>
              </div>
              <label>Email<input type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} autoComplete="email" /></label>
              <label>Phone<input type="tel" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} autoComplete="tel" /></label>
              <label className="consent">
                <input type="checkbox" checked={lead.consent} onChange={(e) => setLead({ ...lead, consent: e.target.checked })} />
                <span>I agree to be contacted about my eligibility check and understand that submitting this form does not create an attorney-client relationship.</span>
              </label>
              {status === "error" && <div className="error">We couldn't submit your information. Please check your connection and try again.</div>}
              <button className="primary" disabled={!canContinue || status === "sending"}>
                {status === "sending" ? "Submitting…" : "Check my eligibility"}
              </button>
            </form>
          )}

          <div className="actions">
            {step > 0 && <button className="back" onClick={back}>← Back</button>}
            {current && <button className="primary" disabled={!canContinue} onClick={next}>Continue</button>}
          </div>

          <p className="privacy">Your information is used only to process your request. Do not enter highly sensitive medical details.</p>
        </section>

        <footer>Not affiliated with or endorsed by any government agency. Eligibility decisions are made by the appropriate government authority.</footer>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);