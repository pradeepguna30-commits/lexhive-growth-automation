# LexHive — Growth Automation Engineer Take-Home

A React qualification funnel with a lead-submission API, Meta Pixel/CAPI event design, an importable n8n workflow, and an Airtable schema.

## What's included

- **React/Vite funnel:** one-question-at-a-time qualification flow and consent-gated contact form.
- **Lead API:** validates required contact/consent fields, hashes email and phone before Meta CAPI delivery, and forwards lead data to n8n.
- **Meta tracking:** browser event hooks and server-side Conversions API payload with a shared event ID for deduplication.
- **n8n workflow:** normalization/validation, valid-lead route, and invalid-data route.
- **Airtable schema:** field template for leads and error logging.
- **Documentation:** assumptions/trade-offs and a short walkthrough script.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Vite prints the local URL in the terminal. To verify a production bundle:

```bash
npm run build
npm run preview
```

A GitHub Actions workflow at `.github/workflows/build.yml` runs the production build on pushes and pull requests to `main`.

## Deploy to Vercel

1. Sign in to Vercel and import this public GitHub repository: `pradeepguna30-commits/lexhive-growth-automation`.
2. Use the Vite defaults: build command `npm run build`, output directory `dist`.
3. Deploy and open the generated URL to verify the funnel loads.
4. Configure the environment variables listed below in the Vercel project settings, then redeploy.
5. Submit a test lead only after the downstream integrations have been configured.

The included `vercel.json` sets the Vite build command and `dist` output directory. Vercel detects the Node.js runtime for `api/lead.js` automatically.

## Environment variables

Set these in the deployment provider's environment-variable settings. Do not commit real values.

| Variable | Purpose |
| --- | --- |
| `VITE_META_PIXEL_ID` | Public Meta Pixel ID used by the browser Pixel (Vite exposes this value in the client bundle; it is not a secret) |
| `META_PIXEL_ID` | Meta Pixel/data source ID for server-side Conversions API events |
| `META_ACCESS_TOKEN` | Server-only Meta Conversions API access token |
| `N8N_WEBHOOK_URL` | Production webhook URL from the activated n8n workflow |

Set `VITE_META_PIXEL_ID` to initialize the browser Pixel. Set `META_PIXEL_ID` and `META_ACCESS_TOKEN` for server-side Conversions API events; the browser and server use the same Lead event ID for deduplication. If Meta CAPI is unavailable, lead delivery to n8n is still attempted. The API returns a visible error if n8n is not configured or lead delivery fails after retries. Qualification answer values are not sent as Meta custom event data.

## Configure n8n and Airtable

1. Import `n8n/lead-intake-workflow.json` into your n8n instance.
2. Create the Airtable tables and fields described in `n8n/airtable-schema.csv`.
3. In the workflow, select your Airtable credential and replace placeholder base/table IDs with your actual IDs.
4. Configure the webhook path as needed, activate the workflow, and copy its production webhook URL into `N8N_WEBHOOK_URL` in Vercel.
5. Send a test payload and verify that a valid lead appears in Airtable and invalid data follows the error branch.

## Important implementation notes

- The workflow JSON is a template: Airtable credentials, base/table IDs, and activation must be configured in the target accounts.
- The browser Pixel script is loaded by the React app only when `VITE_META_PIXEL_ID` is configured.
- The example flow uses representative disability-benefits qualification questions. Replace these with the exact questions approved for the target funnel before production use.
- This is a take-home implementation, not a claim that production services are already connected. A live deployment and end-to-end test should be reported only after you complete and verify them.
- Never put secrets in GitHub. Use environment variables in the hosting provider and credential storage in n8n.

## Supporting docs

- [Assumptions and trade-offs](docs/assumptions-and-tradeoffs.md)
- [Walkthrough script](docs/loom-script.md)
- [n8n workflow](n8n/lead-intake-workflow.json)
- [Airtable schema](n8n/airtable-schema.csv)
