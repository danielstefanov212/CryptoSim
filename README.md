# CryptoSim — Node.js + React Trading Simulator

Cryptocurrency trading simulator with a virtual $10,000 balance, real-time
Kraken prices, watchlists, price alerts, and saved portfolio reports with
PDF export.

> **Author:** Daniel Stefanov · FN 0MI0600397
> **Course:** *Fullstack Application Development with Node.js + Express.js + React.js*
> **GitHub:** <https://github.com/danielstefanov212/CryptoSim>

- **Backend:** Node.js 20+, TypeScript, Express, Socket.IO, Prisma, PostgreSQL.
- **Frontend:** React + Vite + TypeScript, Chart.js.
- **Market data:** Kraken WebSocket (live prices) + Kraken REST OHLC (history).

Documentation: [`docs/documentation.txt`](./docs/documentation.txt) (BG).
Short Bulgarian presentation: [`docs/presentation.pdf`](./docs/presentation.pdf).

## Prerequisites

- Node.js 20+
- Docker (for local Postgres) — or your own Postgres 16
- `canvas` system libs for server-side chart rendering used in PDF export:
  - macOS: `brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman`
  - Debian/Ubuntu: `sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`

## Quickstart

```bash
# 1. Start Postgres
docker compose up -d

# 2. Backend
cd server
cp .env.example .env       # then edit JWT_SECRET / ADMIN_PASSWORD
npm install
npm run migrate
npm run seed
npm run dev                # http://localhost:3001

# 3. Frontend (separate terminal)
cd ../client
cp .env.example .env       # VITE_API_BASE=http://localhost:3001
npm install
npm run dev                # http://localhost:5173
```

## Repo layout

```
CryptoSim-Node/
├── docker-compose.yml        local postgres
├── client/                   React SPA
└── server/                   Express + Socket.IO + Prisma
```
