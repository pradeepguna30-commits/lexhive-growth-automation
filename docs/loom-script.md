# 5-minute Loom walkthrough

## 0:00–0:30 — Product
“This is my React qualification funnel. I kept the interaction one question at a time so the user has a low-friction path from landing to lead capture.”

## 0:30–1:30 — Funnel
“Each answer is held in React state. The final screen captures first name, last name, email, phone and explicit consent. The UI is responsive and the form has a clear failure state.”

## 1:30–2:30 — Meta tracking
“The important part is event quality. I generate one event ID at the start of the funnel. The browser Lead event and the server-side Conversions API event share that event ID, so Meta can deduplicate them. I also capture fbp and fbc, and the server hashes email and phone before sending them to Meta.”

## 2:30–3:45 — Automation
“The form posts to `/api/lead`, not directly to n8n or Meta. The server keeps credentials private, sends the CAPI event, then forwards a structured lead payload to n8n. n8n validates and normalizes the payload before writing to Airtable.”

## 3:45–4:30 — Reliability
“Downstream requests retry three times with exponential backoff. Every request is tied to the same idempotency key. Invalid leads go to a separate error path. In production, I would add a durable queue/outbox for guaranteed delivery during provider outages.”

## 4:30–5:00 — Close
“The main trade-off was keeping the take-home deployable and understandable in the 6–8 hour scope while still demonstrating the architecture I would use in production. The repository includes the n8n workflow, Airtable schema, environment template, assumptions and this walkthrough.”
