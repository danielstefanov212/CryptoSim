# Documentation — CryptoSim

Project: **CryptoSim — Cryptocurrency Trading Simulator**
Course: *Fullstack Application Development with Node.js + Express.js + React.js*
Author: **Daniel Stefanov, FN 0MI0600397**

GitHub repository: <https://github.com/danielstefanov212/CryptoSim>

## Contents

| File | What's in it |
|---|---|
| [`requirements.md`](./requirements.md) | Problem statement, goals, actors, use cases, acceptance criteria, non-goals, risks |
| [`technical-plan.md`](./technical-plan.md) | Architecture, data model (Prisma schema), endpoints, real-time streaming, alert engine, report runner, PDF export, JWT auth, edge cases |
| [`delivery-plan.md`](./delivery-plan.md) | Business-capability task breakdown and AC coverage matrix |

## Overview (one paragraph)

CryptoSim is a risk-free crypto trading simulator. Each user starts with a virtual
$10 000 and can place market BUY/SELL orders against **live Kraken prices** streamed
over Socket.IO. The system supports holdings, order history, watchlists, browser-push
**price alerts**, and saved, re-runnable **portfolio-value-over-time reports** with
server-rendered PDF export. Admins manage users and the crypto-asset catalogue.

## Tech stack at a glance

- **Backend:** Node.js 20, TypeScript, Express, Socket.IO, Prisma, PostgreSQL 16
- **Frontend:** React + Vite + TypeScript, Chart.js, React Router
- **Market data:** Kraken WebSocket v2 (live ticks) + Kraken REST OHLC (history for reports)
- **Auth:** JWT (`jsonwebtoken`) + bcrypt password hashing
- **Validation:** Zod schemas at HTTP boundary
- **Decimal math:** `Prisma.Decimal` (no float drift in money math)
- **PDF:** `pdfkit` + `chartjs-node-canvas` server-side rendering

## Repository layout

```
CryptoSim-Node/
├── README.md                  fresh-checkout quickstart
├── docker-compose.yml         local postgres for development
├── docs/                      this folder
├── presentation/              short Bulgarian presentation of the project
├── client/                    React + Vite SPA
└── server/                    Express + Socket.IO + Prisma + Postgres
    ├── prisma/
    │   ├── schema.prisma      7 entities (User, CryptoAsset, Order, Holding,
    │   │                                  Watchlist, PriceAlert, ReportTemplate)
    │   ├── migrations/        single consolidated init migration
    │   └── seed.ts            20 active assets + admin user
    └── src/
        ├── http/              express app, CORS, error middleware
        ├── routes/            REST endpoints
        ├── schemas/           Zod request validators
        ├── services/          business logic (orders, alerts, reports, …)
        ├── auth/              JWT, bcrypt, middleware
        ├── kraken/            live WS client + OHLC REST client + pair mapping
        ├── sockets/           public + private (per-user JWT) Socket.IO namespaces
        └── alerts/            in-memory alert engine
```

## Running locally

See the project root [`README.md`](../README.md) for the full quickstart
(docker-compose for Postgres, env setup, migrations, seed, and starting both
servers).
