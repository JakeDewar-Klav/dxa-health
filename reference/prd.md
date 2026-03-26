# Demo Environment Health Monitor – PRD

## 1. Overview

**Product name (working):** Demo Environment Health Monitor  
**Owner:** DXA (Demo Experience Architecture) – Jake Dewar  
**Type:** Internal tooling (React dashboard + backend checks)  
**Primary users:** DXA, Amplify / Gen2 owners, Sales Engineers / SAs

This PRD defines a simple, internal dashboard + health‑check system that continuously inspects Klaviyo demo environments and surfaces data quality and integration issues **before** they are discovered on live calls.

The focus is **read-only monitoring** via API/GET requests and a lightweight React UI that exposes health signals and clear action items for DXA.

---

## 2. Problem Statement & Context

### 2.1 Field pain

DXA repeatedly hears from the field that common demo functionality (reporting, predictive analytics, forms, etc.) is missing or unreliable due to gaps in required dummy data or broken data flows. Example themes:

- **SFCC demo env data gaps:** Months with zero new events, making RFM, analytics, and predictive metrics effectively unusable for demos.
- **WooCommerce demo gaps:** Not enough historical events for **Channel Affinity** and **RFM** for canonical profiles like _Klay Villo_, forcing SEs to guess safe time windows for showing reports.
- **Forms reporting unreliability:** SEs “give up” on showing Forms reporting because streams dry up or forms are garbage collected, breaking saved bookmarks without notice.
- **Inconsistent dummy data across accounts:** Reporting and analytics (RFM, Channel Affinity, Churn Risk) are perceived as unreliable from one demo account to the next, largely due to inconsistent or stale dummy data.

Today, DXA + Amplify rely on:

- **Gen2 cron jobs and scripts** to seed and refresh data across multiple demo environments (Shopify, Woo, SFCC, Magento2, etc.).
- **Ad hoc feedback in Slack** (e.g., #ask-demo-experience, #sales-demo-environments) to learn when something is broken.
- **Static parity matrices** and spreadsheets to track which features “should” be demo‑ready in which accounts (e.g., Demo Environments Parity sheet, WIP Gen2 vs KDS EE Parity Matrix).

This model is reactive, brittle, and doesn’t scale as:

- We add more **Gen2 demo accounts** across platforms.
- We stand up **KDS/KDS+EE environments** and need parity baselines.

### 2.2 Core problem

DXA lacks:

1. **Automated, continuous observability** into demo environment data health.
2. **Actionable, prioritized alerts** when environments fall below demo‑ready thresholds.
3. A **single place** to see “Is this environment safe to demo X?” for key features.

Result:

- SEs hit broken or empty surfaces mid‑demo.
- DXA spends time firefighting instead of improving demo experiences.
- KDS adoption is gated by trust in underlying dummy data quality.

---

## 3. Goals & Non‑Goals

### 3.1 Goals (MVP)

1. **Detect and surface data gaps proactively**
   - Identify when demo environments stop receiving key events (e.g., Placed Order, Viewed Product, Active on Site) for more than N hours/days.
   - Flag when feature‑critical metrics (RFM, Channel Affinity, Churn Risk, Forms) lack sufficient recent data to support a “confident” demo.

2. **Provide a single-pane-of-glass dashboard**
   - Show every DXA‑owned demo environment with a clear **health score** and specific **issue flags** (e.g., “SFCC: no Placed Order events for 14 days”).

3. **Generate clear, human-readable action items**
   - Articulate concrete tasks (e.g., “Re‑run Gen2 SFCC event engine,” “Backfill historical orders via CSV upload,” “Recreate a demo signup form for Forms reporting”) with links to existing runbooks/docs where possible.

4. **Bootstrap off existing parity & operations artifacts**
   - Reuse the Demo Environments Overview, Gen2 Discovery/Engine docs, and parity matrices as configuration inputs instead of inventing a parallel taxonomy.

### 3.2 Non‑Goals (for MVP)

- **No automated fixes/remediation.**
  - The tool will not modify demo accounts, run scripts, or alter data; it only inspects and reports.
- **No changes to Gen2/KDS infrastructure.**
  - MVP assumes existing cron jobs, engines, and data generation infrastructure remain the same.
- **No generic customer-account monitoring.**
  - Scope is DXA demo environments and, optionally, a small curated set of internal test accounts.
- **No advanced anomaly detection / ML.**
  - Simple thresholds, trends, and heuristics are sufficient for V1.

---

## 4. Users & Use Cases

### 4.1 Primary users

- **DXA (Demo Experience Architecture)**
  - Own demo environments and experience quality.
  - Need environment‑level views and prioritized to‑do lists.

- **Amplify / Core Infra (Gen2 owners)**
  - Maintain Gen2 demo data generation scripts and infra.
  - Need signals that a connector or engine is down (e.g., SFCC connector stopped sending events).

### 4.2 Secondary users

- **Sales Engineers / Solution Architects**
  - Want a fast way to see if an environment is safe for a specific demo scenario before a call.

- **Product / PM for KDS & Demo Systems**
  - Need quantitative view of data health as they scale KDS and ephemeral environments.

### 4.3 Key use cases

1. **Pre‑demo environment check (SE)**
   - “I have a call in 2 hours. Is **SFCC [[DEMO]]** safe to show **predictive analytics + MA reports**?”
   - Flow:
     - Open dashboard → filter to SFCC → see green/yellow/red status on:
       - Predictive metrics recency
       - RFM completeness
       - Channel Affinity availability
       - Campaign & flow volume in last 30 days

2. **Weekly DXA maintenance sweep**
   - DXA reviews a consolidated list:
     - “Woo [[DEMO]]: No new sign‑up form submissions in 30 days.”
     - “Marketing Analytics [[DEMO]]: Last campaign send > 14 days ago.”
     - “BigCommerce [[DEMO]]: No events at all in last 24h (event engine likely stalled).”
   - DXA uses this to prioritize work with Amplify (Gen2 scripts) or simple fixes (new demo forms).

3. **Gen2 / connector outage detection**
   - SFCC connector silently fails; no new events for weeks.
   - Health monitor sees:
     - Event volume drop to zero for SFCC metrics.
   - Tool posts a Slack alert to DXA + Amplify, instead of waiting for SE complaints.

4. **Feature‑specific health view (e.g., Forms reporting)**
   - “Find an environment where **Form performance** reporting is robust.”
   - Tool surfaces:
     - Envs with ≥ X form submissions/events in last 30 days.
     - Envs where key Forms are not deleted / still active.

5. **Parity scorecard for leadership**
   - Aggregated “demo readiness” score per environment across core pillars:
     - Data freshness
     - Analytics readiness (RFM, Channel Affinity, Churn Risk)
     - Forms & acquisition
     - Key flows and campaigns
   - Used for roadmap decisions (invest in repairing existing Gen2 vs. accelerating KDS adoption).

---

## 5. Scope & Feature Requirements (MVP)

### 5.1 System architecture (conceptual)

- **Frontend:** Lightweight React SPA.
- **Backend:** Small service / scripts that:
  - Periodically call Klaviyo APIs for each demo account (staff endpoints or public APIs with appropriate keys).
  - Compute health indicators & store results (simple DB, JSON files, or equivalent).
  - Expose read‑only REST/JSON endpoints consumed by the React app.
- **Notification channel:** Slack integration for push alerts (MVP: 1–2 channels and/or DXA user group).

> Implementation detail is flexible; PRD focuses on _what_ we check and _how we present it_.

---

### 5.2 Environment catalogue

**FR-1: Demo environment registry**

- The system must ingest/maintain a list of DXA demo environments, including at minimum:
  - **Name** (e.g., “K Service Demo”, “WooCommerce [[DEMO]]”).
  - **Klaviyo Account ID** (KA ID).
  - **Platform / integration type** (Shopify, WooCommerce, SFCC, Magento2, etc.).
  - **Region / locale** (US, EMEA, APAC, etc.).
  - **Intended narrative / primary use case** (e.g., K Service, MA deep dive, WhatsApp demo).

- Source of truth:
  - Seed from **Demo Environments Overview** and **Demo Environments Parity** spreadsheet.
  - Allow local overrides or additional metadata as needed (e.g., “do not monitor; decommissioning”).

**FR-2: Environment metadata view**

- React app must display a master table of environments with:
  - Name, platform, KA ID
  - Narrative tag (e.g., “Default Shopify/K Service”, “WooCommerce customer demos”)
  - Overall health status (see 5.3)

---

### 5.3 Health model

**FR-3: Environment health score**

- Each environment receives a daily **health score** (e.g., 0–100) and **status** (Green/Yellow/Red) based on weighted sub‑dimensions:
  - **Data freshness**
  - **Analytics readiness**
  - **Acquisition & forms health**
  - **Flows & campaigns activity**

**FR-4: Data freshness checks**

Per env, system should compute:

- **FR-4.1**: _Event heartbeat_
  - “Have we seen any events at all in the last N hours?” (e.g., 24h).
- **FR-4.2**: _Key metric freshness_
  - For a small, env‑specific set of critical metrics (e.g., Placed Order, Viewed Product, Started Checkout, Active on Site), check:
    - Last event timestamp
    - Count of events in the last 24h / 7d / 30d
- **FR-4.3**: _Connector‑sensitive envs_
  - For environments known to depend on external demos / connectors (Woo, SFCC, etc.), display a separate flag:
    - “No events from [platform] metrics in last 7 days (likely integration issue).”

**FR-5: Analytics readiness checks**

Target: ensure demo envs can show:

- **RFM**
- **Channel Affinity / Marketing Analytics views**
- **Churn Risk / Predictive analytics** (where supported)

The system should:

- **FR-5.1:** Check whether relevant **derived metrics/segments** exist (e.g., RFM segments, Channel Affinity views) for canonical profiles like **Klay Villo** where applicable.
- **FR-5.2:** Confirm sufficient historical events (e.g., placed orders, clicks, opens) over last X months for these models to be meaningful.
- **FR-5.3:** Flag when:
  - Derived metrics not present at all.
  - Present but starved (e.g., “Channel Affinity failed to compute due to insufficient data” patterns).
- **FR-5.4:** Show a simple label per env:
  - “RFM: Healthy / Thin / Broken”
  - “Channel Affinity: Healthy / Thin / Broken”
  - “Churn Risk / Predictive: Healthy / Thin / Broken”

**FR-6: Forms & acquisition health**

To address “FWIW, I’ve yet to find a consistently reliable Forms report to show in any account”:

- **FR-6.1:** Track:
  - Number of **active forms** in the env.
  - For a curated list of canonical forms (DXA‑tagged), track:
    - Submission counts in last 7d / 30d
- **FR-6.2:** Health rules:
  - “Forms reporting: Green” – ≥ threshold submissions across at least one canonical form in last 30d.
  - “Yellow” – forms exist but low volume.
  - “Red” – no active forms or effectively zero recent submissions.
- **FR-6.3:** Present a quick‑link to recommended “safe” form reports per env when Green/Yellow.

**FR-7: Flows & campaigns activity**

- **FR-7.1:** Ensure each env has:
  - At least N **campaign sends** in last 30d (or per Gen2 cron schedule).
  - At least N **flow‑triggered sends** with attributed revenue where demo stories depend on it (e.g., Abandoned Cart, Back in Stock).
- **FR-7.2:** Flag envs where:
  - Campaigns or flows have been effectively dormant for > X days, contrary to Gen2 schedules.
- **FR-7.3:** Optionally surface:
  - Top 3 flows by sends & revenue for quick “safe flows” reference.

---

### 5.4 UI / UX requirements (React app)

**FR-8: Environments list view**

- Table with:
  - Env name
  - Platform
  - Narrative tag
  - Overall status (Green/Yellow/Red) + numeric health score
  - Key badges (e.g., “RFM thin”, “No SFCC data”, “Forms red”)
- Sorting & filtering:
  - By health, platform, region, status, narrative.

**FR-9: Environment detail view**

For each environment:

- **Summary header**
  - Name, KA ID, platform, region
  - Overall health score + sub‑scores (freshness, analytics, forms, flows)
- **Health sections**
  - **Data Freshness** – last event timestamps, per‑metric counts.
  - **Analytics Readiness** – RFM / Channel Affinity / predictive labels.
  - **Forms & Acquisition** – chart or small table of submissions per canonical form.
  - **Flows & Campaigns** – last send dates and volumes for top flows/campaigns.
- **Action items panel**
  - Ordered list of recommended actions, each with:
    - Category (e.g., “Gen2 Script”, “DXA Config”, “Forms”)
    - Short description (e.g., “Re‑run SFCC event engine for [[QQbPFJ]]; no events in 14 days”).
    - Link to relevant doc/runbook (if available).

**FR-10: Action items list (global)**

- Cross‑env “to‑do” view that aggregates all open issues, sortable by:
  - Severity
  - Env
  - Category
- Designed primarily for DXA maintenance planning.

---

### 5.5 Alerting & notifications

**FR-11: Slack alerts (MVP)**

- **FR-11.1:** When an environment transitions to **Red** on any major dimension, send a Slack message to:
  - DXA channel (e.g., #ask-demo-experience or #sales-demo-environments) and/or a dedicated internal channel.
- **FR-11.2:** Message content:
  - Env name + platform
  - Key failing checks (e.g., “No Placed Order events in last 7d”, “Forms submissions = 0 last 30d”)
  - Link to environment detail in the dashboard.
- **FR-11.3:** Optional: daily/weekly digest summarizing:
  - New issues
  - Resolved issues
  - Overall health trend.

---

## 6. Technical & Integration Considerations

### 6.1 Data sources

- **Klaviyo APIs / staff endpoints**
  - Events & metrics for each demo account.
  - Segments, flows, campaigns, forms, and predictive properties.
- **Static config inputs**
  - **Demo Environments Overview** (Confluence) for env list + platform metadata.
  - **Demo Environments Parity** and **Gen2 vs KDS EE Parity Matrix** for feature expectations per env.

### 6.2 Security & access

- Read‑only **API keys / auth** scoped to demo environments or staff endpoints, managed via 1Password / secrets manager.
- No write operations to demo accounts (enforced at code level).

### 6.3 Performance / cadence

- MVP acceptable targets:
  - Health checks run **hourly** (cron or scheduled job).
  - UI can cache latest results in a small store (DB, file, etc.).
  - React app loads env list and per‑env views within &lt; 2 seconds on typical network.

---

## 7. Success Metrics

Within ~1–2 quarters of adoption:

1. **Reduction in surprise failures**
   - 50%+ reduction in Slack/field reports of “demo‑blocking data issues” discovered _during_ or _immediately before_ calls (proxy: mentions in #ask-demo-experience / #sales-demo-environments).

2. **Improved environment coverage**
   - 100% of DXA demo environments have:
     - Non‑zero event activity in last 7 days.
     - At least one Green/Yellow environment for **RFM**, **Channel Affinity**, **Forms reporting**, **Predictive analytics** demos.

3. **Operational efficiency**
   - DXA can identify and prioritize top 5–10 env issues in &lt; 10 minutes weekly, vs. ad hoc/manual checks today.

4. **KDS readiness (leading indicator)**
   - As KDS+EE roll out, health monitor is extended to include EEs, providing parity visibility vs Gen2 demo accounts.

---

## 8. Risks & Open Questions

### 8.1 Risks

- **API access complexity**
  - Some demo accounts are behind SSO/Okta; might require staff tools or service accounts instead of simple per‑env keys.
- **Noise / alert fatigue**
  - Overly sensitive thresholds could spam Slack and cause people to tune out alerts.
- **Parity drift**
  - Static parity matrices may go stale; health checks must be robust even when “expected features” lists lag reality.

### 8.2 Open questions

1. **Environment set for MVP**
   - Do we monitor _all_ DXA demo accounts initially (K Service, Terraza, Shopify, Woo, Magento2, BigCommerce, SFCC, etc.) or phase by platform?
2. **Threshold tuning**
   - What are acceptable defaults for:
     - “Heartbeat” (24h vs 12h vs 48h)?
     - “Sufficient data” for RFM / Channel Affinity / Forms?
3. **Ownership of follow‑up**
   - How do we codify which issues are DXA‑owned vs Amplify‑owned vs “nice‑to‑fix but not urgent”?
4. **KDS / EE integration**
   - When and how should this tool expand from static Gen2 accounts to KDS ephemeral environments?

---

## 9. Phased Roadmap (High‑Level)

**Phase 0 – Design & config (1–2 weeks)**

- Finalize health model & thresholds for MVP.
- Lock initial environment list + canonical metrics/forms per env.

**Phase 1 – Backend checks + CLI/JSON output (2–3 weeks)**

- Implement scheduled checks against demo accounts.
- Produce JSON outputs summarizing health per env (no UI yet).
- Validate signals manually with DXA/Amplify.

**Phase 2 – React dashboard + Slack alerts (2–4 weeks)**

- Build SPA with env list + detail views.
- Wire in Slack alerts for Red transitions and weekly digest.

**Phase 3 – Iteration & KDS alignment (ongoing)**

- Refine thresholds & UX based on field feedback.
- Add initial support for KDS/EE environments and parity reporting.
