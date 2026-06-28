---
date: 2026-06-19
feature: "CryptoSim — Node.js + React Trading Simulator"
---

# Requirements: CryptoSim — Node.js + React Trading Simulator

## Problem Statement

Beginners often lose money trading cryptocurrency due to lack of experience.
**CryptoSim** is a risk-free simulator that lets users practice crypto trading
against **real-time Kraken prices** with a virtual $10,000 starting balance.

This project is the rewrite of an existing CryptoSim implementation (Java +
React) for the *Fullstack Application Development with Node.js + Express.js +
React.js* course. The frontend stays a React SPA; the backend is rebuilt on
**Node.js + Express** with **Socket.IO** for real-time price streaming. The
data model gains a 7th entity, **ReportTemplate**, so users can build saved,
re-runnable portfolio-performance reports.

## Goals

- Let an Anonymous User register and immediately start trading with $10,000
  virtual cash against live Kraken prices.
- Let a Trader buy/sell crypto, track holdings, view order history, manage a
  watchlist, set price alerts, and reset their account.
- Stream live prices from Kraken to the browser via WebSocket / Socket.IO and
  drive trading, portfolio valuation, and alert evaluation from that stream.
- Let a Trader save **ReportTemplates** that produce a portfolio-value-over-time
  chart (with selectable asset subset and time range, ending now or at a fixed
  date) and export them to PDF.
- Provide an Admin role with CRUD over users and crypto assets, exposed via
  role-gated routes inside the same SPA.

## Actors

- **Anonymous User** — browses Home and sees top-3 sample prices; can register or log in.
- **Trader** (default role on registration) — full trading + portfolio + watchlist + alerts + reports + reset.
- **Administrator** — manages users and the catalogue of supported crypto assets.

## Data Entities (7)

1. **User** — `id, name, email, password (hashed), balance, role (TRADER/ADMIN), createdAt, updatedAt`
2. **CryptoAsset** — `id, symbol, name, krakenPair, description, imageUrl, isActive, createdAt, updatedAt`
   - `symbol` is the user-facing ticker (e.g. `BTC`).
   - `krakenPair` is the Kraken-side trading pair string (e.g. `XBT/USD`), used by both the WebSocket subscription and the historical OHLC REST endpoint.
3. **Order** — `id, userId, orderType (BUY/SELL), symbol, amount, priceAtExecution, totalCost, createdAt`
4. **Holding** — `id, userId, symbol, amount, averageBuyPrice, createdAt, updatedAt` *(amount + avg price recomputed from Orders on each trade)*
5. **Watchlist** — `id, userId, symbol, notes, createdAt`
6. **PriceAlert** — `id, userId, symbol, targetPrice, direction (ABOVE/BELOW), isTriggered, isActive, createdAt, updatedAt`
7. **ReportTemplate** — `id, userId, name, symbols (string[]), startDate, endDate (nullable — null = "now"), createdAt, updatedAt`

### ReportTemplate — detailed behavior

A `ReportTemplate` is a **saved, re-runnable configuration** for a
*Portfolio-Value-Over-Time* report. It is the only report type in v1.

- **Inputs (saved on the template):**
  - `name` — user-chosen label.
  - `symbols` — subset of the **active `CryptoAsset` catalogue** to include
    (`[]` or `null` ⇒ all symbols the user currently holds). Choosing from the
    catalogue (rather than only from current holdings) lets the user include
    assets they used to hold and have since fully sold.
  - `startDate` — beginning of the time window.
  - `endDate` — either a specific date **or `null`**, which is interpreted as
    "now" every time the template is run (so the same template stays
    meaningful as time passes).

- **Output (computed on demand, not stored):**
  - A line chart of total portfolio value over `[startDate, endDate-or-now]`.
  - **Granularity is fixed and implicit in v1:** daily candles for ranges > 1 day,
    hourly for ranges ≤ 1 day. Users cannot override granularity.
  - Underlying historical prices come from **Kraken's public OHLC REST
    endpoint, fetched on demand**. No price-history table in our DB.
  - Portfolio value at time *t* = cash balance at *t* + Σ (holding amount at
    *t* × close price at *t*) over the selected `symbols`. Holding/cash
    timeline is reconstructed from the user's Orders.

- **Pages / interactions:**
  - **Reports list page** (`/reports`) — lists the Trader's saved templates,
    with run / edit / delete actions.
  - **Report detail / run page** (`/reports/:id`) — renders the chart and
    offers a **server-rendered PDF export** button.
  - **Create / edit form** — name, symbol multi-select (from active catalogue),
    start date, end-date mode (specific date | "now").

## Main Use Cases

| Use case | Description | Actors |
|---|---|---|
| Browse sample prices (anonymous) | View Home with top-3 cryptos and their live prices. | Anonymous |
| Browse all crypto prices | Browse Trading Dashboard for live prices on the full catalogue. | Trader, Admin |
| Register | Anonymous User signs up with name, email, password (+ confirm); gets $10,000 and Trader role. Admin can also create users with chosen role. | Anonymous, Admin |
| Login / Logout | Email + password; server issues JWT; logout invalidates session client-side. | Registered |
| Buy crypto | Trader picks a symbol + amount; server validates balance, fetches latest price, deducts cost, creates Order, updates Holding — all atomically in a DB transaction. | Trader |
| Sell crypto | Trader picks a symbol + amount they hold; server validates holding, fetches price, credits balance, creates Order, updates Holding — atomically. | Trader |
| View portfolio | Show holdings valued at live prices, total portfolio value, available cash. | Trader |
| View order history | Browse all Orders for the user, optionally filtered by symbol. | Trader |
| Manage watchlist | Add/remove symbols, edit notes, view live prices for watched symbols. | Trader |
| Set price alerts | CRUD on alerts (symbol, targetPrice, direction). When live price crosses threshold, server triggers alert and pushes a real-time event; client uses **browser notifications**. | Trader |
| Reset account | Delete all Orders, Holdings, Alerts, Watchlist entries, and ReportTemplates for the user; restore $10,000 cash. | Trader |
| Manage report templates | CRUD saved ReportTemplates; run a template to render the chart; export current run to PDF. | Trader |
| Real-time price streaming | Server maintains a WS to Kraken and broadcasts updates over Socket.IO `prices` to authenticated clients (plus a top-3 public stream for anonymous Home); supports subscribe/unsubscribe per pair. | All |
| Admin: manage users | List / view / update / delete users; assign roles. Lives at role-gated routes inside the same SPA. | Admin |
| Admin: manage crypto assets | Create / update / deactivate CryptoAssets in the catalogue. | Admin |

## Main Views (SPA)

| View | URI | Purpose |
|---|---|---|
| Home | `/` | Intro, top-3 cryptos with live prices, register CTA. **Accessible to anonymous users.** |
| Login | `/login` | Login form with validation errors. |
| Register | `/register` | Signup form (name, email, password, confirm). |
| Trading Dashboard | `/trading` | Searchable grid of ticker cards (full active catalogue) — symbol, price, high, low, 24h %, link to details. |
| Crypto Details | `/trading/:symbol` | Live price detail + buy/sell form. |
| Profile | `/profile` | Personal info, holdings @ live prices, order history, **Reset account** button. |
| Watchlist | `/watchlist` | Watched symbols with live prices, add/remove, edit notes. |
| Price Alerts | `/alerts` | List/create/delete alerts, see triggered status. |
| Reports | `/reports` | List of saved ReportTemplates, with create / run / edit / delete. |
| Report run | `/reports/:id` | Renders the portfolio-value chart for the template; PDF export button. |
| Admin — Users | `/admin/users` | Role-gated. List / edit / delete users. |
| Admin — Crypto Assets | `/admin/crypto-assets` | Role-gated. CRUD on the asset catalogue. |
| About | `/about` | Project description and tech stack. |

## API Resources (Express)

| Resource | URI | Methods |
|---|---|---|
| Register | `/api/auth/register` | POST |
| Login | `/api/auth/login` | POST |
| Current user | `/api/users/me` | GET |
| Reset account | `/api/users/reset` | POST |
| Users (Admin) | `/api/users`, `/api/users/:userId` | GET / PUT / DELETE |
| Orders | `/api/orders`, `/api/orders/buy`, `/api/orders/sell` | GET (with `?symbol=`), POST |
| Holdings | `/api/holdings` | GET (with optional `?symbol=`) |
| Watchlist | `/api/watchlist`, `/api/watchlist/:id` | GET / POST / DELETE |
| Price Alerts | `/api/alerts`, `/api/alerts/:id` | GET / POST / PUT / DELETE |
| Crypto Assets | `/api/crypto-assets`, `/api/crypto-assets/:id` | GET / POST (Admin) / PUT (Admin) / DELETE (Admin) |
| Report Templates | `/api/reports`, `/api/reports/:id` | GET / POST / PUT / DELETE |
| Run a report | `/api/reports/:id/run` | GET — returns time-series JSON `[{ t, value }, …]` |
| Export PDF | `/api/reports/:id/export.pdf` | GET — returns `application/pdf` |
| Real-time prices | `/ws` (Socket.IO) | event `prices`; supports subscribe/unsubscribe |

## Acceptance Criteria

### Auth & users
- **AC-1** A new user can register with `(name, email, password, repeatPassword)`; on success they receive a JWT, role `TRADER`, and `balance = 10000`.
- **AC-2** A registered user can log in with email + password and receive a JWT; invalid credentials return a 401 with a clear message.
- **AC-3** All `/api` endpoints except `auth/*` and read-only public sample-price browsing require a valid JWT.
- **AC-4** Admin-only endpoints reject non-admin tokens with 403.
- **AC-5** Admin-only client routes (`/admin/*`) are role-gated; non-admin users hitting them are redirected (or shown a 403 view).

### Trading & portfolio
- **AC-6** A BUY order is rejected when `amount × currentPrice > balance`; on success, balance is debited, an Order row is written, and the Holding row for that symbol is updated (amount + recomputed `averageBuyPrice`).
- **AC-7** A SELL order is rejected when `amount > holding.amount`; on success, balance is credited and the Holding amount is decremented (row removed when amount reaches 0).
- **AC-8** Order execution uses the latest streamed Kraken price; if no recent price is available for the symbol, the order is rejected with a 503-style error.
- **AC-9** Each BUY/SELL is executed atomically across the balance update, the Order insert, and the Holding upsert; partial application is not possible (no scenario in which balance changes without a matching Order, or vice versa).
- **AC-10** Holdings endpoint returns each holding with its live current value computed from the latest price.
- **AC-11** Reset deletes all Orders, Holdings, Alerts, Watchlist entries, and ReportTemplates for the user and sets `balance = 10000`.

### Watchlist & alerts
- **AC-12** A Trader can add, list, edit notes on, and remove watchlist entries; entries are scoped to the authenticated user.
- **AC-13** A Trader can CRUD price alerts; when a streamed price crosses `targetPrice` in the chosen `direction`, the server marks the alert `isTriggered = true` and emits a real-time event the client surfaces as a browser notification.
- **AC-14** Already-triggered or inactive alerts do not fire again.

### Real-time prices
- **AC-15** The server maintains a single upstream Kraken WebSocket connection and re-broadcasts ticker updates to authenticated Socket.IO clients on the `prices` event.
- **AC-16** Clients can subscribe and unsubscribe to specific trading pairs; the server only forwards relevant updates.
- **AC-17** Anonymous clients on Home receive only the top-3 cryptos via a public namespace; they cannot subscribe to arbitrary pairs.
- **AC-18** If the upstream Kraken connection drops, the server reconnects with backoff and resumes streaming.
- **AC-19** Socket.IO connections validate the JWT at handshake; unauthenticated clients cannot subscribe to the authenticated `prices` channel.

### Crypto asset catalogue
- **AC-20** On first start with an empty database, the server seeds a fixed list of ~20 popular CryptoAssets (BTC, ETH, SOL, XRP, ADA, DOGE, …) including their `krakenPair` values. Seeding is idempotent — restarting the server does not duplicate rows.
- **AC-21** Admins can POST a new CryptoAsset, PUT to update its metadata, and DELETE to deactivate (`isActive = false`). Deactivated assets are hidden from non-admin listings but kept in the table so existing Orders/Holdings still resolve.

### Report templates
- **AC-22** A Trader can create a ReportTemplate with `(name, symbols[], startDate, endDate-or-null-meaning-now)`. `symbols` may be empty/null to mean "all current holdings"; otherwise it must be a subset of the active `CryptoAsset` catalogue.
- **AC-23** `GET /api/reports` returns only the authenticated user's templates; access to another user's template returns 404.
- **AC-24** `GET /api/reports/:id/run` returns a time series of `{ t, value }` covering `[startDate, endDate ?? now]`, where `value` = cash at `t` + Σ (holding amount at `t` × close price at `t`) for the selected symbols.
- **AC-25** Historical close prices are fetched on demand from Kraken's public OHLC REST endpoint; CryptoSim does **not** persist its own price history.
- **AC-26** Granularity is daily for ranges > 1 day, hourly for ranges ≤ 1 day; ranges > 720 daily candles are clamped or paginated to respect Kraken's limits. Users cannot override granularity in v1.
- **AC-27** Cash balance and holdings at time `t` are reconstructed from the user's Orders (no separate snapshot table).
- **AC-28** A reports list page (`/reports`) shows all templates with run / edit / delete actions; a detail page (`/reports/:id`) renders the chart and exposes a PDF export.
- **AC-29** `GET /api/reports/:id/export.pdf` returns a server-rendered PDF containing the rendered chart, the template's name, the resolved time window, and the included symbols.

### General
- **AC-30** All views are SPA routes under React Router; deep links work on refresh.
- **AC-31** Passwords are stored hashed (bcrypt or equivalent); plain passwords are never returned by any endpoint.
- **AC-32** Server-side validation rejects malformed input with 400 + a descriptive error body.

## Non-Goals

- Real money, real custody, or any production-grade financial logic.
- Persisting our own historical price data (we always pull from Kraken on demand).
- Order types beyond market BUY / SELL (no limit / stop / margin orders).
- Email-based password reset, email verification, OAuth / social login.
- Mobile apps; only the responsive web SPA.
- Per-asset performance reports, P&L attribution, or tax-style reporting (only portfolio-value-over-time is in scope).
- Multi-currency cash; balance is USD-denominated only.
- Fee / spread modelling — trades execute at the streamed Kraken last price.
- **Automated tests** — not required by the course and not in scope for this delivery. Functional demo only.
- User-configurable report granularity (fixed daily/hourly in v1).
- A separate admin shell; admin features live under role-gated `/admin/*` routes in the same SPA.

## Constraints

- **Backend:** Node.js + Express. Real-time via **Socket.IO**. JWT auth. Trade execution must be atomic. Persistence DB to be chosen at planning (likely PostgreSQL or MongoDB; the existing Java project uses PostgreSQL and is the reference, not a mandate).
- **Frontend:** React SPA with React Router, building on the structure of the existing `client/` (Vite + TypeScript). Re-use components/styles where it saves work. WebSocket layer must be rewritten from STOMP/SockJS to Socket.IO.
- **Market data:** Kraken WebSocket for live ticks; Kraken public REST OHLC endpoint for historical data used by reports. No paid data feeds. `CryptoAsset.krakenPair` is the canonical Kraken-side identifier for both feeds.
- **PDF export:** Generated server-side. Library choice deferred to planning (PDFKit + server-rendered chart image vs Puppeteer rendering the report page, etc.).
- **Catalogue seeding:** App seeds ~20 popular CryptoAssets idempotently on first start.
- **Course requirements:** Single-page app with distinct URL per view; REST/JSON API; real-time streaming via WebSocket / Socket.IO; ≥ 6 entities (we have 7).

## Risks

- **Kraken rate limits** on the public OHLC endpoint may bite when many users run reports concurrently — caching / batching strategy to be evaluated in Plan.
- **Reconstructing portfolio value at arbitrary `t`** is the trickiest piece: replaying Orders chronologically and joining against per-day Kraken candles must be correct, especially around the very first/last day of the window and for symbols the user has fully sold off mid-window.
- **Real-time alert evaluation** must be cheap — every streamed tick may need to check against active alerts. Naive per-tick DB scans will not scale; the indexing / lookup approach is deferred to Plan.
- **Kraken WS reconnects / sequence gaps** can cause stale prices to drive trades or alerts; a staleness-detection mechanism for the cached last price per symbol must be defined in Plan (cross-references AC-8, which already requires order rejection when no recent price is available).
- **Browser notifications** require user permission; UX must degrade gracefully when permission is denied.
- **Server-side PDF generation** is a frequent source of dependency bloat (headless Chromium etc.); must be evaluated against simpler options (e.g. PDFKit + a server-rendered chart image) at planning time.
- **Auth on the WebSocket** — Socket.IO connections must validate JWTs at handshake, not after; otherwise unauthenticated clients can briefly receive prices.
- **Account reset wiping ReportTemplates** is a deliberate choice (AC-11) — confirmed.
- **Catalogue mutation safety** — deactivating a CryptoAsset that is referenced by existing Orders/Holdings/Watchlist/Alerts/Reports must not break those rows; `isActive = false` (soft-delete) is required rather than a hard DELETE.

## Open Questions

These are deferred to the Plan phase — they are *how* decisions, not *what*
decisions, and require codebase / library exploration that belongs in Plan:

1. **DB and ORM/query layer** — PostgreSQL vs MongoDB; if Postgres, ORM choice (Prisma, Drizzle, Knex, raw `pg`). The Java reference uses PostgreSQL + raw JDBC.
2. **PDF library** — `pdfkit` + a server-rendered chart image vs `puppeteer` rendering the React report page vs a third option. Tradeoff is dependency weight vs fidelity.
3. **Charting library on the client** — Recharts, Chart.js, ECharts, Victory; influenced by what's easiest to also render server-side or to PNG.
4. **Validation library on the server** — Zod, Joi, class-validator, express-validator.
5. **Project layout for the new Node server** — feature-folders vs layered (controllers/services/repositories mirroring the Java reference).
6. **Socket.IO public vs authenticated namespace shape** — single namespace with selective broadcast vs two namespaces (`/public`, `/`).
