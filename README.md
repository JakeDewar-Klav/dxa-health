# DXA Account Health

A real-time health monitoring dashboard for Klaviyo demo environments. Tracks data freshness, analytics readiness, forms health, and flow/campaign performance across 12 demo accounts — surfacing issues before they impact live demos.

Built for DXA, Amplify/Gen2 owners, and Sales Engineers.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) |
| Backend | [Convex](https://convex.dev) (queries, mutations, actions, crons) |
| UI | [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS 4 |
| Icons | [Lucide](https://lucide.dev) |
| Language | TypeScript (strict) |

## Features

**Dashboard** — At-a-glance status of all demo environments with health scores, filterable by platform and status.

**Environment Detail** — Per-environment breakdown across four health pillars with tabbed views for overview and granular metrics.

**Metrics Manager** — Cross-environment view of all Klaviyo metrics with stale detection and bulk management.

**Feature Health** — Tracks readiness of key Klaviyo features (Channel Affinity, RFM, Predictive Analytics, Forms) across all environments.

**Action Items** — Prioritized list of issues (missing API keys, stale data, broken analytics) with resolve/dismiss workflows.

**Automated Checks** — Hourly cron job pulls live data from the Klaviyo API, computes scores, and generates action items.

## Health Scoring

Each environment is scored 0–100 across four pillars (25 points each):

| Pillar | What it checks |
|--------|---------------|
| **Data Freshness** | Recent events across critical metrics (24h / 7d / 30d windows) |
| **Analytics Readiness** | RFM, Channel Affinity, and Predictive Analytics availability |
| **Forms Health** | Active forms count and estimated submission activity |
| **Flows & Campaigns** | Active flows, recent campaigns, and optional conversion reporting |

**Status thresholds:** Green (≥75), Yellow (≥40), Red (<40).

## Getting Started

### Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account
- Klaviyo API keys for the demo environments you want to monitor

### Installation

```bash
npm install
```

### Convex Setup

Start the Convex dev server (this will prompt you to create or link a deployment):

```bash
npx convex dev
```

Set the Klaviyo API keys for each demo environment in your Convex deployment:

```bash
npx convex env set KLAVIYO_API_KEY_SHOPIFY sk-xxxx
npx convex env set KLAVIYO_API_KEY_WOO sk-xxxx
npx convex env set KLAVIYO_API_KEY_SFCC sk-xxxx
npx convex env set KLAVIYO_API_KEY_MAGENTO2 sk-xxxx
npx convex env set KLAVIYO_API_KEY_BIGCOMMERCE sk-xxxx
npx convex env set KLAVIYO_API_KEY_KSERVICE sk-xxxx
npx convex env set KLAVIYO_API_KEY_MA sk-xxxx
npx convex env set KLAVIYO_API_KEY_CAFE sk-xxxx
npx convex env set KLAVIYO_API_KEY_PRESTASHOP sk-xxxx
npx convex env set KLAVIYO_API_KEY_ZENOTI sk-xxxx
npx convex env set KLAVIYO_API_KEY_APAC sk-xxxx
npx convex env set KLAVIYO_API_KEY_MINDBODY sk-xxxx
```

### Next.js Setup

Create `.env.local` with your Convex deployment URL (printed by `npx convex dev`):

```
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Seed Demo Environments** on first visit, then **Refresh All** to trigger the initial health checks.

## Project Structure

```
app/
├── page.tsx                    # Dashboard home
├── environments/
│   ├── page.tsx                # Environment list
│   └── [envId]/page.tsx        # Environment detail (Overview + Metrics tabs)
├── metrics/page.tsx            # Cross-environment metrics manager
├── features/page.tsx           # Feature health overview
├── actions/page.tsx            # Action items queue
├── layout.tsx                  # Root layout with sidebar
├── ConvexClientProvider.tsx    # Convex React provider
└── refresh-context.tsx         # Global refresh state management

components/
├── app-sidebar.tsx             # Navigation sidebar
├── environment-card.tsx        # Environment status card
├── global-refresh-button.tsx   # Refresh all environments trigger
├── health-score-badge.tsx      # Score/status display components
└── ui/                         # shadcn primitives

convex/
├── schema.ts                   # Database schema (environments, healthChecks, metrics, actionItems)
├── environments.ts             # Environment CRUD + health check triggers
├── healthChecks.ts             # Health check queries + storage
├── metrics.ts                  # Metric queries + management
├── actionItems.ts              # Action item queries + workflows
├── crons.ts                    # Hourly health check schedule
├── lib/
│   └── environments.ts         # Demo environment catalog (12 accounts)
└── klaviyo/
    ├── client.ts               # Klaviyo API HTTP client with retry logic
    ├── actions.ts              # Health check orchestration (Node.js actions)
    ├── scoring.ts              # Pillar and overall score computation
    └── thresholds.ts           # Analytics feature detection heuristics
```

## Demo Environments

| Environment | Platform | Region |
|------------|----------|--------|
| Shopify [[DEMO]] | Shopify | US |
| WooCommerce [[DEMO]] | WooCommerce | US |
| SFCC [[DEMO]] | SFCC | US |
| Magento 2 [[DEMO]] | Magento 2 | US |
| BigCommerce [[DEMO]] | BigCommerce | US |
| K Service Demo | Shopify | US |
| Marketing Analytics [[DEMO]] | Shopify | US |
| Cafe [[DEMO]] | Shopify | US |
| PrestaShop [[DEMO]] | PrestaShop | US |
| Zenoti [[DEMO]] | Zenoti | US |
| APAC [[DEMO]] | Shopify | APAC |
| Mindbody [[DEMO]] | Mindbody | US |

To add or remove environments, edit `convex/lib/environments.ts` and re-seed from the dashboard.

## Deployment

Build for production:

```bash
npm run build
npm start
```

Deploy Convex functions to production:

```bash
npx convex deploy
```

Ensure `NEXT_PUBLIC_CONVEX_URL` points to your production Convex deployment and all Klaviyo API keys are set in the production environment.
