# LexHive Take-Home — Assumptions & Trade-offs

## What I built

I treated the funnel as a qualification-first acquisition flow rather than a generic contact form. The experience is intentionally one question at a time to reduce cognitive load, while the final step collects contact information and explicit consent.

The lead pipeline is designed around one canonical `event_id`. The browser uses it for the Meta Lead event, and the server uses the same ID for Conversions API delivery and the n8n payload. This makes deduplication and troubleshooting much easier than generating independent IDs in each layer.

## Tracking quality

I capture `_fbp` and `_fbc` where present and pass them server-side. Email and phone are normalized and SHA-256 hashed before being sent to Meta. The server also forwards the client IP and user-agent values available at the request edge.

The important design choice is that the browser is not trusted with the Meta access token. CAPI credentials remain server-side.

## Reliability

Downstream requests use bounded exponential-backoff retries. The API returns the same event ID when a failure occurs, making replay safe when paired with an idempotency-aware downstream store.

The n8n workflow validates required contact fields and has an explicit invalid-data branch. In production, I would put a durable queue/outbox between the API and downstream providers so a temporary Meta/n8n outage cannot lose a lead.

## Automation/database

n8n is intentionally used as the automation boundary. Airtable is the structured operational store. The schema keeps attribution fields, qualification answers, consent-related context, and processing status available for operations and QA.

## Assumptions

The supplied brief only identifies the reference funnel and the required architecture; it does not provide a field-level specification for the source funnel. I therefore used a representative disability-benefits qualification flow and kept the questions modular so they can be swapped without changing the tracking or automation architecture.

## Extra decisions

- Mobile-first responsive UI
- Explicit consent language
- No secrets in source control
- Server-side PII hashing before Meta
- Event IDs exposed in API errors for observability
- Importable n8n workflow and Airtable schema included
