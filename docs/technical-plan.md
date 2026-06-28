---
date: 2026-06-19
feature: "CryptoSim — Node.js + React Trading Simulator"
companion: delivery_plan.md
---

## 1. Problem Statement

Rewrite the existing Java + React `CryptoSim` trading simulator with a
**Node.js + Express** backend, **Socket.IO** for real-time price streaming,
and the existing React + Vite + TypeScript frontend. Extend the data model from
3 entities to 7, adding `CryptoAsset`, `Watchlist`, `PriceAlert`, and
`ReportTemplate`. The new `ReportTemplate` entity enables saved, re-runnable
*Portfolio-Value-Over-Time* reports with server-rendered PDF export.

See `requirements.md` for the full problem statement, goals, and use cases.

---

## 2. Acceptance Criteria

See `requirements.md` → `## Acceptance Criteria` (AC-1 through AC-32). All ACs
are carried over unchanged and must be covered by `delivery_plan.md`.

---

## 3. Non-Goals

See `requirements.md` → `## Non-Goals`. The most relevant for planning:

- **Automated tests** — not in scope (course does not require them).
- **No persisted historical price data** — OHLC always pulled from Kraken on demand.
- **No order types beyond market BUY/SELL.**
- **No separate admin shell** — admin lives under role-gated `/admin/*` routes in the same SPA.
- **No user-configurable report granularity** in v1.

---

## 4. Proposed Approach

### 4.1 Considered Options (data-access stack)

The biggest cross-cutting fork was the database + data-access stack. Three
meaningfully different options were considered and presented to the user:

- **Option A — PostgreSQL + raw `pg` driver.** Mirrors the Java reference's
  `JdbcTemplate` pattern. Manual `schema.sql`; manual SQL with parameter
  binding.
  - *Tradeoffs:* Lowest abstraction surface. Most boilerplate (~7 repository
    files × manual row mappers + CRUD SQL). No generated types; risk of
    drift between schema and TypeScript types.
  - *Codebase alignment:* Maximally faithful to the Java reference, including
    `INSERT … ON CONFLICT` UPSERT pattern. Easiest mental mapping for the
    student.
  - *Estimated scope:* ~7 repo files + manual `schema.sql` + manual seed script.

- **Option B — PostgreSQL + Prisma ORM.** *(Selected)* Type-safe data layer with
  auto-generated TypeScript types from `schema.prisma`. `prisma migrate` for
  schema. `prisma.$transaction` for AC-9 atomicity. Built-in seed runner for
  AC-20.
  - *Tradeoffs:* One extra dependency layer (Prisma Client). One migration to
    learn. Significantly less boilerplate. End-to-end type safety for the data
    model.
  - *Codebase alignment:* Layered structure (routes → controllers → services →
    repositories) still mirrors the Java reference; Prisma replaces the
    `JdbcTemplate` calls inside repositories without changing the shape of
    the layers.
  - *Estimated scope:* `schema.prisma` (1 file) + thin repository wrappers
    (~7 files) + seed.ts.

- **Option C — MongoDB + Mongoose.** Document store, schemaless dev experience.
  - *Tradeoffs:* AC-9 atomicity requires Mongo transactions, which require a
    replica set even in dev — operational complexity for a course project.
    Relational integrity (orders → users, watchlists → assets, etc.) is
    artificial in Mongo. Furthest from the Java reference.
  - *Codebase alignment:* Lowest. The Java reference is PostgreSQL-relational.
  - *Estimated scope:* Comparable to A/B but with more bespoke transaction
    plumbing.

**Selected: Option B — PostgreSQL + Prisma ORM** (user-selected). Best fit for
a 7-entity relational domain that needs transactional trade execution. Best
ergonomics for the scope of a course project. Closest to "modern 2026 Node.js"
without diverging from the reference's layered architecture.

### 4.2 Sub-decisions (single viable approach each)

The following sub-decisions were locked based on codebase exploration and
ecosystem fit. Each lists the one chosen tool and the reason competing options
were rejected. The user can override any of these.

| Concern | Chosen | Why this; why not the alternatives |
|---|---|---|
| HTTP framework | **Express 4** | Course mandates Express. |
| Real-time | **Socket.IO 4** | Course mandates Socket.IO. |
| Server language | **TypeScript** (compiled via `tsx` in dev, `tsc` for prod) | Matches the client; types compose with Prisma-generated types end-to-end. |
| Validation | **Zod** | TS-first, inferred types reusable across server boundaries. Joi/express-validator are good but lose the type-inference win. class-validator requires decorators that don't compose with Prisma's plain objects. |
| Auth | **`jsonwebtoken` + `bcryptjs`** | Direct Node analogues of the reference's `jjwt` + Spring Security `BCryptPasswordEncoder`. `bcryptjs` chosen over `bcrypt` to avoid native-build issues on student machines. |
| Money / decimal arithmetic | **`decimal.js`** (server) for balance and amount math; persisted as `Decimal` in Prisma | Mirrors the reference's `java.math.BigDecimal`. Avoids JS float drift on cash and crypto amounts. |
| Charting library (client) | **Chart.js + `react-chartjs-2`** | Same chart config object works server-side via `chartjs-node-canvas`, so the PDF rendering reuses the exact chart definition. Recharts is more React-idiomatic but its server-side rendering path is harder. |
| PDF library | **`pdfkit` + `chartjs-node-canvas`** | Lightweight. `pdfkit` builds the document; `chartjs-node-canvas` renders the chart to PNG and embeds it. Puppeteer (the alternative) ships ~200MB of headless Chromium and is overkill for a single PDF route. |
| Socket.IO namespace shape | **Two namespaces — `/public` (no auth, broadcasts top-3 only) and `/` (JWT-required, full subscribe/unsubscribe)** | Puts the auth boundary at the namespace boundary (clean and impossible to subvert per AC-17/19). Alternative "single namespace with selective broadcast" leaks the channel name to anonymous clients and requires per-broadcast filtering on every emit. |
| HTTP error handling | **Express error-handling middleware + a `HttpError` class hierarchy** | Mirrors the Java reference's `GlobalExceptionHandler` + `ValidationException`. Centralizes status-code mapping. |
| Server project structure | **Layered: `src/{routes,controllers,services,repositories,middleware,sockets,validation,errors,kraken,reports,seed}`** | One-to-one mirror of the Java reference's `controller / service / repository / config / security / exception / dto` packages, modernized for Node-Express idioms. |
| Logging | **`pino`** | Lightweight, fast, JSON output. Reference uses standard SLF4J at DEBUG; `pino` is the modern Node equivalent. |
| Config | **`dotenv` + a typed `config.ts`** | Mirrors the reference's `application.properties` + `@Value`. Validates required env vars on boot. |
| Dev runner | **`tsx watch`** | Restarts on TS file changes; no separate `nodemon` needed. |
| Cors | **`cors` middleware** | Mirrors `CorsConfig.java`. |

### 4.3 High-level architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│ React SPA (Vite + TS)                                                  │
│  Pages: Home, Login, Register, Trading, TradingDetails, Profile,       │
│         Watchlist, Alerts, Reports, ReportRun, Admin/Users,            │
│         Admin/CryptoAssets, About                                      │
│  Outlets: Public, Private, Admin (role-gated)                          │
│  Contexts: UserProvider, UserPreferencesProvider, CryptoPriceProvider  │
│  Services: http-service, auth, users, orders, holdings, watchlist,     │
│            alerts, reports, crypto-assets                              │
│                                                                        │
│  Socket.IO client (replaces STOMP/SockJS):                             │
│    namespace=/public (anonymous Home top-3)                            │
│    namespace=/        (auth-required, all subscribe/unsubscribe)       │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ REST/JSON                       │ Socket.IO
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Express server (Node 20+, TypeScript)                                  │
│                                                                        │
│  Middleware: cors → json body parser → request-id → pino logger        │
│              → jwtAuth (sets req.user) → routes                        │
│              → errorHandler (HttpError → status/body)                  │
│                                                                        │
│  Routes/Controllers (1 per resource)                                   │
│   auth, users, orders, holdings, watchlist, alerts, crypto-assets,     │
│   reports                                                              │
│                                                                        │
│  Services (business logic, transactions)                               │
│   AuthService, UserService, OrderService, HoldingService,              │
│   WatchlistService, AlertService, CryptoAssetService,                  │
│   ReportService, ReportRunner, PdfRenderer                             │
│                                                                        │
│  Repositories (thin Prisma wrappers, 1 per entity)                     │
│                                                                        │
│  Sockets                                                               │
│   PublicNamespace (/public): broadcasts top-3 ticks                    │
│   PrivateNamespace (/):  JWT handshake; subscribe/unsubscribe          │
│                                                                        │
│  Kraken integration                                                    │
│   KrakenLiveClient: single upstream WS to wss://ws.kraken.com/v2       │
│     - subscribed pairs registry (refcount per pair across clients)     │
│     - latest-price cache + receivedAt timestamp                        │
│     - reconnect with exponential backoff                               │
│     - emits ticker events to a shared EventEmitter                     │
│   KrakenOhlcClient: REST client to Kraken /0/public/OHLC               │
│     - in-memory LRU cache keyed by (krakenPair, interval, since)       │
│                                                                        │
│  Alert engine: subscribes to KrakenLiveClient EventEmitter,            │
│   maintains an in-memory index activeAlertsBySymbol[],                 │
│   evaluates per tick, flips PriceAlert.isTriggered atomically,         │
│   pushes a Socket.IO event to the owning user's room.                  │
│                                                                        │
│  Seed runner (on boot): idempotent INSERT of ~20 CryptoAssets          │
│   from a static catalogue including krakenPair (WS) + krakenRestPair.  │
└─────────────────────────────┬──────────────────────────────────────────┘
                              │ Prisma Client
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PostgreSQL  (managed via prisma migrate)                               │
│  Tables: User, CryptoAsset, "Order", Holding, Watchlist, PriceAlert,   │
│          ReportTemplate                                                │
└────────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ ws:// upstream
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Kraken                                                                 │
│  WS:  wss://ws.kraken.com/v2  (ticker channel)                         │
│  REST: https://api.kraken.com/0/public/OHLC                            │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Repository layout (proposed)

```
/                              ← workspace root (already exists)
├── CryptoSim/                 ← Java reference (kept for reference only)
├── client/                    ← React SPA (moved out of CryptoSim/)
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App/
│       ├── components/
│       ├── contexts/
│       │   ├── user-context.tsx
│       │   ├── user-preferences-context.tsx
│       │   └── crypto-price-context.tsx       ← rewritten for Socket.IO
│       ├── hooks/
│       ├── lib/
│       ├── outlets/
│       │   ├── public-outlet.tsx
│       │   ├── private-outlet.tsx
│       │   └── admin-outlet.tsx               ← NEW
│       ├── pages/
│       │   ├── home/
│       │   ├── login/
│       │   ├── register/
│       │   ├── profile/
│       │   ├── trading-page/
│       │   ├── trading-ticker-details-page/
│       │   ├── watchlist/                     ← NEW
│       │   ├── alerts/                        ← NEW
│       │   ├── reports/                       ← NEW (list)
│       │   ├── report-run/                    ← NEW (detail + chart + PDF)
│       │   ├── admin-users/                   ← NEW
│       │   ├── admin-crypto-assets/           ← NEW
│       │   └── about/                         ← NEW
│       ├── services/
│       │   ├── http-service.ts
│       │   ├── socket-service.ts              ← NEW (Socket.IO client)
│       │   ├── auth-service.ts
│       │   ├── users.ts
│       │   ├── orders.ts
│       │   ├── holdings.ts
│       │   ├── watchlist.ts                   ← NEW
│       │   ├── alerts.ts                      ← NEW
│       │   ├── reports.ts                     ← NEW
│       │   └── crypto-assets.ts               ← NEW
│       └── ...
└── server/                    ← NEW Node.js + Express backend
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── seed.ts
    └── src/
        ├── index.ts                ← bootstrap: env, prisma, http, ws, seed
        ├── config.ts               ← typed env loader
        ├── app.ts                  ← Express factory + middleware wiring
        ├── http/
        │   ├── server.ts           ← creates http.Server, attaches Socket.IO
        │   └── error-handler.ts
        ├── middleware/
        │   ├── jwt-auth.ts
        │   ├── require-role.ts
        │   └── validate.ts         ← Zod schema → 400 with details
        ├── errors/
        │   ├── http-error.ts       ← HttpError base + BadRequest, Unauthorized,
        │   │                          Forbidden, NotFound, Conflict, ServiceUnavailable
        │   └── validation-error.ts
        ├── routes/                 ← thin: bind path → controller method
        │   ├── auth.routes.ts
        │   ├── users.routes.ts
        │   ├── orders.routes.ts
        │   ├── holdings.routes.ts
        │   ├── watchlist.routes.ts
        │   ├── alerts.routes.ts
        │   ├── crypto-assets.routes.ts
        │   └── reports.routes.ts
        ├── controllers/            ← parse req, call service, send res
        │   ├── auth.controller.ts
        │   ├── users.controller.ts
        │   ├── orders.controller.ts
        │   ├── holdings.controller.ts
        │   ├── watchlist.controller.ts
        │   ├── alerts.controller.ts
        │   ├── crypto-assets.controller.ts
        │   └── reports.controller.ts
        ├── services/               ← business logic, transactions
        │   ├── auth.service.ts
        │   ├── users.service.ts
        │   ├── orders.service.ts
        │   ├── holdings.service.ts
        │   ├── watchlist.service.ts
        │   ├── alerts.service.ts
        │   ├── crypto-assets.service.ts
        │   ├── reports.service.ts      ← CRUD for ReportTemplate
        │   ├── report-runner.ts        ← computes the time series
        │   └── pdf-renderer.ts         ← builds the PDF
        ├── repositories/           ← thin Prisma wrappers
        │   ├── prisma.ts               ← single PrismaClient instance
        │   ├── users.repo.ts
        │   ├── orders.repo.ts
        │   ├── holdings.repo.ts
        │   ├── watchlist.repo.ts
        │   ├── alerts.repo.ts
        │   ├── crypto-assets.repo.ts
        │   └── report-templates.repo.ts
        ├── kraken/
        │   ├── live-client.ts        ← upstream WS, subscriptions, price cache
        │   ├── ohlc-client.ts        ← REST OHLC + LRU cache
        │   └── pair-mapping.ts       ← symbol ↔ krakenPair (WS) + krakenRestPair
        ├── sockets/
        │   ├── public-namespace.ts   ← /public, anonymous, top-3
        │   └── private-namespace.ts  ← /, JWT handshake, subscribe/unsubscribe,
        │                                per-user room for alert notifications
        ├── alerts/
        │   └── engine.ts             ← subscribes to live-client ticker stream,
        │                                evaluates active alerts, flips & notifies
        ├── validation/              ← Zod schemas, one per resource
        │   └── *.schema.ts
        └── seed/
            └── catalogue.ts          ← static top-20 CryptoAsset list
```

### 4.5 Prisma schema (sketch)

```prisma
generator client { provider = "prisma-client-js" }
datasource db   { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role        { TRADER ADMIN }
enum OrderType   { BUY SELL }
enum Direction   { ABOVE BELOW }

model User {
  id              Int      @id @default(autoincrement())
  name            String
  email           String   @unique
  password        String                    // bcrypt hash
  balance         Decimal  @default(10000) @db.Decimal(18,2)
  role            Role     @default(TRADER)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  orders          Order[]
  holdings        Holding[]
  watchlist       Watchlist[]
  alerts          PriceAlert[]
  reportTemplates ReportTemplate[]
}

model CryptoAsset {
  id              Int      @id @default(autoincrement())
  symbol          String   @unique          // "BTC"
  name            String                    // "Bitcoin"
  krakenPair      String                    // "BTC/USD"    (v2 WS subscribe)
  krakenRestPair  String                    // "XBTUSD"     (REST OHLC endpoint)
  description     String?
  imageUrl        String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Order {
  id              Int       @id @default(autoincrement())
  userId          Int
  user            User      @relation(fields: [userId], references: [id])
  orderType       OrderType
  symbol          String                              // "BTC"
  amount          Decimal   @db.Decimal(28,12)
  priceAtExecution Decimal  @db.Decimal(18,8)
  totalCost       Decimal   @db.Decimal(28,12)
  createdAt       DateTime  @default(now())

  @@index([userId])
  @@index([userId, symbol])
  @@index([userId, createdAt])               // for the report time-walk
}

model Holding {
  id              Int      @id @default(autoincrement())
  userId          Int
  user            User     @relation(fields: [userId], references: [id])
  symbol          String
  amount          Decimal  @db.Decimal(28,12)
  averageBuyPrice Decimal  @db.Decimal(18,8)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@unique([userId, symbol])
  @@check([amount >= 0], name: "holding_amount_nonneg") // expressed via raw SQL if Prisma doesn't natively support
}

model Watchlist {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  symbol    String
  notes     String?
  createdAt DateTime @default(now())
  @@unique([userId, symbol])
}

model PriceAlert {
  id          Int       @id @default(autoincrement())
  userId      Int
  user        User      @relation(fields: [userId], references: [id])
  symbol      String
  targetPrice Decimal   @db.Decimal(18,8)
  direction   Direction
  isTriggered Boolean   @default(false)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  @@index([symbol, isActive, isTriggered])
  @@index([userId])
}

model ReportTemplate {
  id        Int       @id @default(autoincrement())
  userId    Int
  user      User      @relation(fields: [userId], references: [id])
  name      String
  symbols   String[]                           // empty/null ⇒ all current holdings
  startDate DateTime
  endDate   DateTime?                          // null ⇒ "now" at run time
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  @@index([userId])
}
```

### 4.6 Trade execution (BUY/SELL) — atomicity flow

For each BUY (analogous for SELL), the controller validates payload via Zod,
then calls `OrderService.buy(userId, { symbol, amount })`. The service:

```
prisma.$transaction(async (tx) => {
  const price = krakenLive.getCachedPrice(symbol)           // throws 503 if no recent price
  const totalCost = amount * price                          // Decimal math

  // Atomic conditional debit — single SQL statement, no read-then-write race.
  // Returns count=1 if the row was updated (sufficient balance), count=0 otherwise.
  const debited = await tx.user.updateMany({
    where: { id: userId, balance: { gte: totalCost } },
    data:  { balance: { decrement: totalCost } },
  })
  if (debited.count === 0) throw new BadRequest("Insufficient balance")

  // Holding upsert with averageBuyPrice recomputed:
  const existing = await tx.holding.findUnique({ where: { userId_symbol: { userId, symbol } } })
  const newAmount = (existing?.amount ?? 0) + amount
  const newAvg = existing
    ? (existing.amount*existing.averageBuyPrice + amount*price) / newAmount
    : price
  await tx.holding.upsert({
    where:  { userId_symbol: { userId, symbol } },
    update: { amount: newAmount, averageBuyPrice: newAvg },
    create: { userId, symbol, amount: newAmount, averageBuyPrice: newAvg },
  })

  return tx.order.create({ data: { userId, orderType: 'BUY', symbol, amount, priceAtExecution: price, totalCost } })
})
```

SELL is symmetric and uses the same conditional-update guard:
`tx.holding.updateMany({ where: { userId, symbol, amount: { gte: req.amount } }, data: { amount: { decrement: req.amount } } })`
→ if `count === 0` throw `BadRequest("Insufficient holding")`; otherwise credit
balance with `tx.user.update({ data: { balance: { increment: totalValue } } })`
and write the Order. If the SELL drove `amount` to zero, a follow-up
`deleteMany` inside the same transaction removes the row.

The conditional `updateMany` pattern is what gives AC-6 / AC-7 / AC-9 their
real concurrency guarantee — it collapses the check-then-act into a single SQL
`UPDATE … WHERE balance >= …` (or holding amount), which PostgreSQL serializes
via row-level locks even at the default READ COMMITTED isolation level. A
naïve `findUnique → if → update` would race under concurrent BUYs from the
same user (e.g. double-click submit, multiple tabs), violating AC-6.

### 4.7 Real-time price streaming

**Upstream (`KrakenLiveClient`):** Single WebSocket to
`wss://ws.kraken.com/v2`, opened at server boot. Re-uses the v2 ticker
subscription pattern from the Java reference (`{"method":"subscribe","params":
{"channel":"ticker","symbol":["BTC/USD"]}}`). Tracks subscriptions with a
**refcount per pair** so that multiple downstream clients subscribing to the
same pair only produce one upstream subscribe, and the upstream unsubscribe
fires only when the refcount hits zero. Caches the latest price as
`Map<symbol, { price: Decimal, receivedAt: number }>`. On disconnect, reconnects
with exponential backoff (1s, 2s, 4s, 8s, capped at 30s) and re-issues all
subscriptions for the current refcount set. Emits ticker events on a shared
`EventEmitter` (`'tick' (symbol, priceData)`).

**Downstream — Public namespace (`/public`):** No JWT required. On boot, the
namespace `join`s an internal room for each of the **top-3 symbols** (BTC, ETH,
XRP — sourced from the seeded catalogue's flagged top-3) and broadcasts every
tick for those three. Anonymous clients receive only those events. There is no
subscribe/unsubscribe API on this namespace.

**Downstream — Private namespace (`/`):** JWT validated at handshake via
Socket.IO middleware (`io.of('/').use(jwtHandshake)`); the handshake reads the
token from `socket.handshake.auth.token`, verifies it, and decorates
`socket.data.user`. Per-socket events: `'subscribe' (symbols[])` and
`'unsubscribe' (symbols[])`. Each subscribe calls
`krakenLive.subscribe(symbols)` (refcount++) and `socket.join('symbol:'+s)`.
Each Kraken tick → `io.of('/').to('symbol:'+s).emit('price', priceData)`. On
disconnect, all the socket's subscriptions are unsubscribed (refcount--).
Each authenticated socket also joins a per-user room `'user:'+userId` for
direct alert notifications.

**Staleness check:** `KrakenLiveClient` exposes two accessors with identical
staleness semantics (`Date.now() - receivedAt < PRICE_STALENESS_MS`, default
30s) but different failure modes:

- `getCachedPrice(symbol): Decimal` — throws `ServiceUnavailable` if missing
  or stale. Used by `OrderService` (the trade is rejected with 503 per AC-8)
  and the `AlertEngine` evaluator (the alert is simply not checked on this
  tick, never fired stale).
- `tryGetCachedPrice(symbol): Decimal | null` — returns `null` if missing or
  stale. Used by `HoldingService` (per §4.10b — the holdings list degrades
  gracefully to `currentPrice: null`) and any other read-only display path
  that must not blow up on a temporarily unavailable feed.

Both accessors read the same underlying `Map<symbol, { price, receivedAt }>`,
so there is no possibility of divergence between trade execution and display.

### 4.8 Alert engine

`AlertEngine` boots after the DB is reachable and the Kraken upstream is
connected. It maintains an **in-memory index**: `Map<symbol, PriceAlert[]>` of
all active, untriggered alerts. The index is hydrated on boot from
`PriceAlert.findMany({ where: { isActive: true, isTriggered: false } })`. The
engine listens on the `KrakenLiveClient` EventEmitter `'tick'` event; for each
tick it iterates the relevant symbol's alert list, evaluates the direction
predicate, and for any alert that fires it:

1. Atomically updates the DB: `prisma.priceAlert.update({ where: { id, isTriggered: false }, data: { isTriggered: true } })` — the `where` guard ensures we never double-trigger.
2. Removes the alert from the in-memory index.
3. Emits `io.of('/').to('user:'+userId).emit('alert:triggered', alertDto)` so the owner's browser shows a notification.

CRUD endpoints on `PriceAlert` notify `AlertEngine` to add/remove entries from
the index so it stays in sync without a DB scan per tick. AC-12 (already-
triggered or inactive alerts do not fire again) follows from index hydration
plus the `isTriggered: false` guard on update.

### 4.9 Catalogue seeding (AC-20)

`prisma/seed.ts` reads `server/src/seed/catalogue.ts` (a static list of ~20
popular crypto assets, each with `symbol, name, krakenPair, krakenRestPair,
description?, imageUrl?`) and runs `prisma.cryptoAsset.upsert({ where: {
symbol }, update: {}, create: {...} })` for each. Idempotent across restarts
(no row duplication; no metadata clobbering of admin-edited rows). The seed is
invoked from `src/index.ts` on boot (in addition to being runnable via
`prisma db seed`) so a fresh DB without any tooling still gets seeded.

Top-3 (used by the public namespace) is the first 3 entries of the catalogue,
flagged via order rather than a column.

### 4.10 ReportRunner — Portfolio Value Over Time

This is the most algorithmically involved piece. Given a `ReportTemplate`,
`ReportRunner.run(template, userId)` returns `[{ t, value }, …]`.

**Algorithm:**

1. **Resolve the window.** `start = template.startDate`; `end = template.endDate ?? new Date()`.
2. **Resolve symbol set.** If `template.symbols` is empty/null → use the set of symbols the user has ever held (derive via `SELECT DISTINCT symbol FROM "Order" WHERE userId = ?`). Otherwise use `template.symbols` (which AC-22 already validates as a subset of the active catalogue).
3. **Pick granularity.** `(end - start) > 24h ⇒ daily`; otherwise `hourly`. AC-26 fixes these two as the only user-facing granularities (no user override in v1). If the chosen granularity would produce > 720 candles, the runner internally widens the bucket size (daily → weekly → monthly as needed) purely as a clamp mechanism — `weekly`/`monthly` are not user-facing options and never appear in the template config; they only surface in the response metadata as `clamped: true, effectiveGranularity: 'weekly'` so the chart can label the axis correctly.
4. **Build the t-axis.** Generate the timestamps `t_0 = start, t_1, …, t_n = end` at the chosen granularity.
5. **Fetch OHLC per symbol.** For each symbol in the resolved set, call `KrakenOhlcClient.fetch(krakenRestPair, intervalMinutes, since=start)`. The client returns `[{ t, close }, …]` and caches the result in an in-memory LRU keyed by `(krakenRestPair, intervalMinutes, sinceBucket)` (5-minute bucket on `sinceBucket` to keep the cache useful across nearby runs). On Kraken rate-limit (HTTP 429) → throws a `ServiceUnavailable` mapped to 503.
6. **Replay user orders chronologically.** `prisma.order.findMany({ where: { userId, createdAt: { lte: end } }, orderBy: { createdAt: 'asc' } })`. Walk an in-memory `{ cash: Decimal, holdings: Map<symbol, Decimal> }` ledger, applying each order to update cash and per-symbol amount. Initial cash = 10000 (or compute from the user's net cash deposits if reset history matters — for v1: assume 10000 is the only seed event, since AC-11 reset is destructive).
7. **At each `t_i`,** snapshot the ledger as of `t_i` (replay all orders with `createdAt <= t_i`) and compute `value(t_i) = cash(t_i) + Σ_{symbol ∈ selected} holding_amount(symbol, t_i) × ohlcClose(symbol, t_i)`. Use the closest OHLC candle at or before `t_i`; if no candle exists yet (data older than Kraken's history), use 0 for that symbol's contribution. Symbols the user has fully sold by `t_i` contribute 0, which is correct.
8. **Return** the full response shape:

   ```ts
   {
     template: { id, name, symbols, startDate, endDate },
     window: {
       start: ISO8601,
       end:   ISO8601,                          // start..end ?? now, resolved at request time
       granularity: 'hourly' | 'daily',         // the user-facing granularity per AC-26
       clamped: boolean,                        // true ⇒ runner widened the bucket internally
       effectiveGranularity?: 'weekly' | 'monthly',   // only present when clamped (see edge case #11)
     },
     dataGaps: [{ symbol, gapBefore: ISO8601 }], // any symbols with no Kraken OHLC at the window start (edge case #10)
     points: [{ t: ISO8601, value: string /* Decimal */ }, …]
   }
   ```

   This is the single contract consumed by both `GET /api/reports/:id/run` and
   the PDF renderer (§4.11) — so the JSON and the PDF stay in sync by
   construction.

**Performance note:** The replay step is O(orders × points) in the naive form;
for typical inputs (< 1000 orders × < 365 points) this is well under 10ms.
A more efficient pointer-walk (advance the order index as `t` increases) is
the obvious optimization — implemented if the naive version measures slow.

### 4.10b Holdings response shape (AC-10)

`HoldingService.listForUser(userId)` loads the user's `Holding` rows via the
repository, then **for each row, joins** `KrakenLiveClient.tryGetCachedPrice(
holding.symbol)` — the non-throwing sibling accessor described in §4.7. Same
staleness window as `OrderService.getCachedPrice` (so stale-on-trade is also
stale-on-display); `null` is returned when the price is missing or stale. The
returned DTO shape is:

```ts
{
  id, symbol, amount, averageBuyPrice,
  currentPrice: Decimal | null,      // null if no recent price for this symbol
  currentValue: Decimal | null,      // amount * currentPrice, or null
  createdAt, updatedAt
}
```

The controller passes this DTO list straight through. `null` for
`currentPrice` / `currentValue` lets the client distinguish "this symbol's
price feed is temporarily unavailable" from "the symbol has no value" so the
UI can degrade gracefully (display "—" instead of "$0.00").

### 4.10c Account reset (AC-11)

`POST /api/users/reset` is authenticated and operates on `req.user.id`. The
service performs the cascade inside a single `prisma.$transaction`:

```
await prisma.$transaction([
  prisma.priceAlert.deleteMany({       where: { userId } }),
  prisma.watchlist.deleteMany({        where: { userId } }),
  prisma.reportTemplate.deleteMany({   where: { userId } }),
  prisma.holding.deleteMany({          where: { userId } }),
  prisma.order.deleteMany({            where: { userId } }),
  prisma.user.update({ where: { id: userId }, data: { balance: INITIAL_BALANCE } }),
])
```

After the transaction commits, the service calls `AlertEngine.purgeUser(userId)`
to remove any in-memory alert entries for that user (consistent with edge case
#7). The endpoint returns the updated `User` DTO. Ordering inside the
transaction is irrelevant for correctness (no FK from anything to anything but
`User`), but is listed alerts → watchlist → reports → holdings → orders → user
to read top-down "wipe artifacts, then the account state".

### 4.11 PDF export (`GET /api/reports/:id/export.pdf`)

1. Run the report as above to get `{ window, points, template }`.
2. Use `chartjs-node-canvas` with the same Chart.js dataset config the client
   would use to render a 1200×600 PNG of the line chart.
3. Use `pdfkit` to build the PDF: header (template name), metadata (resolved
   window: start, end-or-now-resolved, granularity, included symbols), then
   embed the PNG. Return `Content-Type: application/pdf` and
   `Content-Disposition: attachment; filename="report-<id>.pdf"`.

### 4.12 Auth flow

- `POST /api/auth/register` — Zod-validate `{ name, email, password, repeatPassword }`, `bcryptjs.hash(password, 10)`, insert User, sign and return JWT. Reject duplicate email with 409.
- `POST /api/auth/login` — verify hash, return JWT or 401.
- `jwtAuth` middleware: extracts `Authorization: Bearer …`, verifies, sets `req.user = { id, role }`. On failure → 401 (with `name: "TokenExpiredError"` for expired tokens so the client's existing handler in `http-service.ts` works unchanged).
- `requireRole('ADMIN')` middleware on `/api/users` (admin endpoints) and `POST/PUT/DELETE /api/crypto-assets`.
- Socket.IO handshake middleware: identical token verification; reject the handshake (instead of 401-ing later) per AC-19.

### 4.13 Client changes

- **App.tsx** — add `/watchlist`, `/alerts`, `/reports`, `/reports/:id`, `/admin/users`, `/admin/crypto-assets`, `/about` routes. Wrap `/admin/*` in a new `AdminOutlet` that requires `user.role === 'ADMIN'` and otherwise redirects to `/`.
- **`contexts/crypto-price-context.tsx`** — rewrite the WS guts using `socket.io-client`. Connect to `/public` if no token, `/` (auth-required) if token present. Keep the existing exported API (`subscribeToPair`, `unsubscribeFromPair`, `prices`, `loading`, `error`) so downstream pages (`trading-page`, `trading-ticker-details-page`) don't change.
- **Services** — new `watchlist.ts` (includes `update(id, { notes })` for AC-12), `alerts.ts`, `reports.ts`, `crypto-assets.ts` using the existing `http-service.ts` patterns. New `socket-service.ts` exposing both namespaces.
- **Pages (new)** — `watchlist/`, `alerts/`, `reports/` (list + create/edit modal), `report-run/` (chart + PDF button), `admin-users/`, `admin-crypto-assets/`, `about/`.
- **Browser notifications** — a `useBrowserNotifications` hook that requests permission once and listens to the Socket.IO `alert:triggered` event. Degrades gracefully (toast in-app) when permission is denied.
- **TOP_3_CRYPTO_PAIRS / TOP_20_CRYPTO_PAIRS constants** — kept only for the public namespace fallback before the catalogue loads, otherwise sourced from the catalogue endpoint.

---

## 5. API / Schema / Contract Changes

### 5.1 REST endpoints (Express)

The full list is in `requirements.md` → API Resources. Net-new (vs the Java
reference) endpoints:

| Endpoint | Method | Notes |
|---|---|---|
| `/api/watchlist` | GET / POST | List user's entries; create new entry. |
| `/api/watchlist/:id` | PUT / DELETE | PUT updates `{ notes }` (AC-12 "edit notes"); DELETE removes the entry. Both owner-scoped; 404 if not owner. |
| `/api/alerts` | GET / POST | List user's alerts; create new alert. |
| `/api/alerts/:id` | PUT / DELETE | Update active/triggered; owner-scoped delete. |
| `/api/crypto-assets` | GET / POST (Admin) | Public list of active assets; admin creates new. |
| `/api/crypto-assets/:id` | PUT / DELETE (Admin) | Admin update / soft-delete (sets isActive=false). |
| `/api/reports` | GET / POST | Owner-scoped list; create template. |
| `/api/reports/:id` | GET / PUT / DELETE | Owner-scoped CRUD; 404 if not owner. |
| `/api/reports/:id/run` | GET | Returns `{ window, points, template }`. |
| `/api/reports/:id/export.pdf` | GET | Returns `application/pdf`. |

All endpoints not under `/api/auth/*` require JWT; admin endpoints additionally
require role `ADMIN`. Error bodies follow `{ name, message, details? }` with
HTTP status codes matching the ACs.

### 5.2 Database schema (Prisma migration)

All seven tables created in the initial migration. Critical indexes:
`Holding @@unique([userId, symbol])`, `Order @@index([userId, createdAt])` (for
the report replay), `PriceAlert @@index([symbol, isActive, isTriggered])` (for
the boot hydration of the alert engine), `User.email @unique`.

### 5.3 Socket.IO events / namespaces

| Namespace | Auth | Client → Server | Server → Client |
|---|---|---|---|
| `/public` | None | (none) | `'price' (priceData)` for top-3 only |
| `/` | JWT at handshake (`socket.handshake.auth.token`) | `'subscribe' (symbols[])`, `'unsubscribe' (symbols[])` | `'price' (priceData)` per subscribed pair, `'alert:triggered' (alertDto)` to per-user room |

### 5.4 Config keys (env)

`PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRATION_SECONDS`,
`KRAKEN_WS_URL` (default `wss://ws.kraken.com/v2`),
`KRAKEN_REST_BASE` (default `https://api.kraken.com`),
`PRICE_STALENESS_MS` (default `30000`),
`INITIAL_BALANCE` (default `10000`),
`LOG_LEVEL` (default `info`),
`CORS_ORIGIN` (comma-separated).

### 5.5 Backward compatibility

This is a **greenfield rewrite under a new `server/` directory**. The Java
project under `CryptoSim/server/` is left untouched as reference. The client
under `CryptoSim/client/` is **moved** to the workspace's `client/` to detach it
from the Java repo; existing components are reused. Public API URLs are
preserved exactly (`/api/...`), so a frontend without backend awareness behaves
identically to today. The Socket.IO change IS a breaking client/server contract
change — the client's `crypto-price-context.tsx` must be updated in lockstep
(no users of the legacy STOMP path remain after that file's rewrite).

---

## 6. Edge Cases

| # | Case | Handling |
|---|---|---|
| 1 | Order for a symbol with no cached price (server just started, or upstream WS down) | Service rejects with `ServiceUnavailable` → 503 (AC-8). |
| 2 | Cached price is older than `PRICE_STALENESS_MS` | Same as #1 — treat as missing. |
| 3 | BUY with `amount × price > balance` | Service rejects with `BadRequest` → 400 (AC-6). |
| 4 | SELL with `amount > holding.amount` | Service rejects with 400 (AC-7). |
| 5 | SELL that drives holding to exactly 0 | Holding row is deleted in the same transaction. |
| 6 | Concurrent BUY/SELL for the same user (double-click submit, multiple tabs) | The conditional `updateMany({ where: { id, balance: { gte: totalCost } }, data: { balance: { decrement: totalCost } } })` (and the symmetric guard for SELL on the Holding row) collapses the check-then-act into a single SQL `UPDATE … WHERE …`, which PostgreSQL serializes via row-level locks. If `count === 0` (the gate failed), the service rejects with 400. AC-6 / AC-7 hold even under READ COMMITTED. |
| 7 | Account reset while alert engine has stale in-memory copies of that user's alerts | Reset deletes alerts in DB then calls `AlertEngine.purgeUser(userId)` to clear the index. |
| 8 | Admin deactivates a CryptoAsset that has open Holdings/Watchlist entries | Soft-delete only (`isActive = false`); rows remain. Listing filters by `isActive` for non-admin queries. |
| 9 | Report with an empty resolved symbol set (user has no orders, asks for "all holdings") | Return a flat zero-value series for cash-only timeline (cash = INITIAL_BALANCE − net spent up to t). |
| 10 | Report window starts before Kraken has OHLC data for a pair | For points where OHLC has no candle yet, that symbol contributes 0 to the value. Add a `dataGaps: [{ symbol, gapBefore: t }]` note in the response metadata. |
| 11 | Report window > 720 candles at the chosen granularity | Widen the bucket internally (daily → weekly → monthly) and set `clamped: true, effectiveGranularity: '<bucket>'` in the response metadata. The widened bucket is a runtime clamp only — it is never a user-selectable granularity per AC-26. |
| 12 | OHLC REST call fails (network / 5xx) | Retry once after 500ms; if it fails again → 503 to client, no partial render. |
| 13 | OHLC REST call hits Kraken rate-limit (429) | Same as #12 but skip the retry; return 503. The in-memory cache mitigates burst load. |
| 14 | Socket.IO client subscribes to a symbol not in the catalogue | Server emits `'subscribe:error' { symbol, reason: 'unknown_symbol' }` and skips. |
| 15 | Socket.IO client provides an expired JWT at handshake | Handshake rejected with `Error('TokenExpiredError')` — Socket.IO emits the connection error to the client; the existing http-service expired-token handler logs the user out. |
| 16 | Kraken upstream WS reconnect mid-trade | Cached price falls stale → trades start failing with 503 until the resubscription catches up. Acceptable per AC-8 / AC-18. |
| 17 | Two browser sessions for the same user (multiple sockets) | Each socket joins `user:<id>` independently — alert notifications fan out to both. Subscription refcount is per-socket so closing one doesn't kill the other's subscriptions. |
| 18 | Browser notification permission denied | Hook falls back to in-app toast for the `alert:triggered` event. |
| 19 | PDF route called with `?download=false` / browser-preview intent | Behavior is the same — `Content-Disposition: attachment` always. (Out-of-scope to handle preview mode in v1.) |
| 20 | Holding `averageBuyPrice` precision drift across many trades | Use `decimal.js` throughout the recompute; persist with the Prisma `Decimal(18,8)` type. |

---

## 7. Risks

Carried forward from `requirements.md` → `## Risks` (5 risks), plus the
following implementation-specific risks identified during planning:

- **Prisma migration drift in a multi-machine course context** — each demo
  environment must run `prisma migrate deploy` before the seed runs.
  Mitigation: `src/index.ts` invokes `prisma migrate deploy` (or surfaces a
  clear error) at boot.
- **`chartjs-node-canvas` system dependencies** — depends on `canvas`, which
  in turn requires native libs (Cairo, Pango). Mitigation: lock the node
  version and document the install steps; if install pain proves chronic,
  fall back to `pdfkit`-native vector drawing of a simple line chart.
- **Socket.IO + Express CORS for `/public` namespace** — `cors` package
  handles HTTP CORS but Socket.IO needs its own `cors: { origin, ... }`
  option. Both must be wired consistently or the public namespace silently
  fails to connect from the dev client.
- **`BigInt`/`Decimal` JSON serialization** — Prisma's `Decimal` doesn't
  serialize as a plain number by default; we need a `BigInt.prototype.toJSON`
  shim and / or a Prisma middleware to convert `Decimal` to `string` on
  response. Easy to forget; will cause subtle client-side display bugs.
- **Time-zone handling for report windows** — all `DateTime` columns are UTC;
  the React form must send ISO-8601 with `Z` suffix; chart axis labels render
  in the browser local TZ. Edge cases around DST and the "today" bucket need
  a quick sanity-check during implementation.
- **Catalogue admin actions that change `symbol`** — changing a CryptoAsset's
  symbol would orphan existing Orders/Holdings/Watchlist/Alerts rows. Plan:
  the PUT endpoint forbids changing `symbol` (only metadata is editable);
  symbol changes require delete + recreate, which by definition is a new
  asset.

---

## Footer

See `delivery_plan.md` for tasks breakdown and execution sequencing.
