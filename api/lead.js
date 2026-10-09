import crypto from "node:crypto";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (value) =>
  crypto.createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");

async function postWithRetry(url, body, headers = {}) {
  if (!url) return { skipped: true, reason: "not_configured" };

  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      if (response.ok) return { ok: true, status: response.status };
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 2) await wait(300 * 2 ** attempt);
  }
  throw lastError || new Error("Downstream request failed");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = req.body || {};
  const id = req.headers["idempotency-key"] || payload.eventId;
  const lead = payload.lead;
  const email = String(lead?.email || "").trim();
  const phone = String(lead?.phone || "").trim();
  const firstName = String(lead?.firstName || "").trim();
  const lastName = String(lead?.lastName || "").trim();

  if (
    !id ||
    !firstName ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    phone.replace(/\D/g, "").length < 7 ||
    lead?.consent !== true
  ) {
    return res.status(400).json({ error: "Valid contact details and explicit consent are required." });
  }

  if (!process.env.N8N_WEBHOOK_URL) {
    return res.status(503).json({ error: "Lead automation is not configured yet." });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const metaBody = {
    data: [{
      event_name: "Lead",
      event_time: timestamp,
      event_id: id,
      action_source: "website",
      event_source_url: payload.pageUrl,
      user_data: {
        em: [hash(email)],
        ph: [hash(phone.replace(/\D/g, ""))],
        fn: [hash(firstName)],
        ln: [hash(lastName)],
        client_ip_address: req.headers["x-forwarded-for"]?.split(",")[0],
        client_user_agent: req.headers["user-agent"],
        fbp: payload.fbp || undefined,
        fbc: payload.fbc || undefined,
      },
      custom_data: { funnel: "eligibility-v1" },
    }],
  };

  // The automation/database route is the lead-delivery path. A Meta outage must
  // not prevent a consented lead from reaching the operational system.
  const automationPromise = postWithRetry(
    process.env.N8N_WEBHOOK_URL,
    {
      event_id: id,
      event_time: new Date(timestamp * 1000).toISOString(),
      lead: { first_name: firstName, last_name: lastName, email, phone },
      answers: payload.answers || {},
      attribution: { fbp: payload.fbp || "", fbc: payload.fbc || "", ...payload.utm },
      page_url: payload.pageUrl,
    },
    { "X-Idempotency-Key": id },
  );

  const metaConfigured = Boolean(process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN);
  const metaPromise = metaConfigured
    ? postWithRetry(
        `https://graph.facebook.com/v20.0/${process.env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(process.env.META_ACCESS_TOKEN)}`,
        metaBody,
      ).then((result) => ({ status: "sent", ...result }))
        .catch((error) => {
          console.error("meta_capi_delivery_failed", { eventId: id, error: error.message });
          return { status: "failed" };
        })
    : Promise.resolve({ status: "skipped", reason: "not_configured" });

  try {
    const [automation, metaResult] = await Promise.all([automationPromise, metaPromise]);
    return res.status(200).json({ ok: true, eventId: id, automation, metaResult });
  } catch (error) {
    console.error("lead_automation_delivery_failed", { eventId: id, error: error.message });
    return res.status(502).json({
      ok: false,
      eventId: id,
      error: "Lead automation delivery failed after retries. Retry using the same idempotency key.",
    });
  }
}
