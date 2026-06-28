---
marp: true
theme: default
paginate: true
size: 16:9
header: "CryptoSim — Симулатор за търговия с криптовалути"
footer: "Daniel Stefanov · FN 0MI0600397 · ФМИ"
style: |
  section { font-size: 26px; }
  h1 { color: #1f4e8c; }
  h2 { color: #1f4e8c; }
  code { background: #f0f4f8; padding: 1px 6px; border-radius: 4px; }
  table { font-size: 22px; }
---

<!-- _class: lead -->
<!-- _paginate: false -->

# CryptoSim

### Симулатор за търговия с криптовалути

**Daniel Stefanov** · ФН **0MI0600397**
*Fullstack Application Development with Node.js + Express.js + React.js*

🔗 <https://github.com/danielstefanov212/CryptoSim>

<!--
Здравейте. Аз съм Даниел Стефанов и днес ще ви представя моя курсов проект — CryptoSim.
Това е симулатор за търговия с криптовалути, написан на Node.js и React.
-->

---

## Какво представлява проектът?

- **Безрискова среда** за упражняване на търговия с крипто
- Всеки потребител започва с виртуални **$10 000**
- Реални цени в реално време от борсата **Kraken**
- Покупка/продажба, портфолио, watchlist, ценови **alerts**
- **Запазваеми отчети** на стойността на портфейла във времето с **PDF експорт**
- Админ панел за управление на потребители и активи

<!--
Накратко — потребителят се регистрира, получава виртуални 10 000 долара и може да
"купува" и "продава" реални криптовалути по реални борсови цени, но без да рискува
реални пари. Целта е обучителна.
-->

---

## Технологичен стек

| Слой | Технологии |
|---|---|
| Frontend | React + Vite + TypeScript, Chart.js, React Router, Socket.IO client |
| Backend | Node.js 20, Express, Socket.IO, TypeScript |
| База данни | PostgreSQL 16 + **Prisma** ORM |
| Реално време | **Kraken WebSocket v2** (тикове) + REST OHLC (история за отчети) |
| Сигурност | **JWT** + bcrypt, Zod валидация, CORS allow-list |
| Decimal математика | `Prisma.Decimal` / `decimal.js` (без floating-point грешки) |
| PDF | `pdfkit` + `chartjs-node-canvas` (server-side chart) |

<!--
Цялото приложение е написано на TypeScript. Backend-ът е Express + Socket.IO, а
персистенцията се случва през Prisma към PostgreSQL. Цените идват от Kraken — на
живо през WebSocket, а историята за отчетите се сваля при поискване от REST
endpoint-а за OHLC свещи.
-->

---

## Архитектура

```
┌────────────┐   REST + Socket.IO   ┌──────────────┐   WS v2   ┌─────────┐
│  React SPA │ ───────────────────▶ │  Express +   │ ────────▶ │ Kraken  │
│  (Vite)    │ ◀─── live prices ─── │  Socket.IO   │ ◀───────  │ exchange│
└────────────┘                      └──────┬───────┘            └─────────┘
                                           │ Prisma
                                           ▼
                                    ┌──────────────┐
                                    │ PostgreSQL   │  7 entities:
                                    │  + migrations│  User, CryptoAsset,
                                    └──────────────┘  Order, Holding,
                                                      Watchlist, PriceAlert,
                                                      ReportTemplate
```

- Public Socket.IO namespace → топ-3 цени за анонимни посетители
- Private Socket.IO namespace → JWT handshake, per-user стая за alerts

<!--
Архитектурата е класически SPA + REST API + real-time канал. Имам два Socket.IO
namespace-а: публичен — за топ-3 цени, които виждат и неавтентикираните; и частен —
който изисква JWT при ръкостискане и поставя сокета в стая, специфична за
потребителя, по която изпращам alert-ите.
-->

---

## Данни и атомарност

7 entity-та: `User`, `CryptoAsset`, `Order`, `Holding`, `Watchlist`,
`PriceAlert`, `ReportTemplate`.

**Сделките са атомарни** — `prisma.$transaction`:
- BUY: cash↓, holding↑, нов Order — всичко или нищо
- SELL: `SELECT ... FOR UPDATE` на user-а първо → предотвратява dead-lock
- Race условия → 409 `CONCURRENT_TRADE`

**Парите са `Decimal`** — никакви float грешки в сметките.

<!--
Всяка сделка е една транзакция. Първо взимам user-row lock при SELL, за да предотвратя
deadlock между паралелни BUY и SELL заявки. Ако все пак има конфликт, връщам 409.
Всички парични величини са Decimal, не float, така че няма грешки от закръгляне.
-->

---

## Alerts (известия в реално време)

1. Потребител създава `PriceAlert` (символ, target price, ABOVE/BELOW)
2. **AlertEngine** (in-memory индекс) → автоматично се абонира за този символ от Kraken
3. На всеки tick → O(N) сравнение по символ с `Decimal.gte`/`lte`
4. При trigger → **атомичен** `updateMany({ isTriggered: false })` (защита от двойно firing)
5. Engine emit-ва вътрешен event → Socket.IO го изпраща в user-овата стая
6. Frontend хук показва **native desktop notification** (Web Notifications API)

> Refcounted Kraken абонаменти — много alerts на BTC → една абонамент upstream.

<!--
Алертите работят изцяло в памет за бързина. Когато ценовият tick дойде, проверявам
условията на всички alerts за този символ и при trigger атомарно маркирам в базата
и emit-вам Socket.IO event. Клиентът показва нативно desktop notification — изскачащ
прозорец, видим дори когато табът е минимизиран.
-->

---

## Отчети (Portfolio-Value-Over-Time)

**Запазваем template** с два режима:
- Fixed start date — закотвена дата
- Rolling — "последните N дни" (плъзга се при всеки run)

**Runner алгоритъм:**
1. Резолване на window (clamp на бъдещи дати)
2. Избор на granularity: hourly ≤ 24ч, иначе daily/weekly/monthly (до 720 точки)
3. **`Promise.allSettled`** на Kraken OHLC fetch — провал на един символ → data gap, не цял отчет
4. Replay на order ledger-а през оста на времето с decimal математика
5. **Честни `null` стойности** при липсваща история → chart показва прекъсване, не $0

**PDF експорт** — същата Chart.js конфигурация рендерирана server-side.

<!--
Отчетите са най-сложната част. Не пазя исторически цени в моята база — те се теглят
свежи от Kraken при всяко стартиране. После пускам order ledger-а на потребителя през
оста на времето и на всяка стъпка изчислявам стойност = cash + сума(amount * цена).
PDF-ът се рендерира със същия Chart.js, но в Node — така приложението и експортът
изглеждат еднакво.
-->

---

## Sigurnost и валидация (на четири слоя)

| Слой | Какво |
|---|---|
| **CORS** | allow-list `localhost:5173,5174` |
| **JWT auth** | `jsonwebtoken`, bcrypt hash на пароли, expiry guard |
| **Zod schemas** | Валидация на всеки request payload в Express middleware |
| **Service guards** | `assertKnownSymbol`, `assertWindowOrdering`, `assertDatesNotInFuture` |
| **Owner-scoped 404** | Cross-user IDs не са изброими (връща 404, не 403) |
| **Атомарни ъпдейти** | `updateMany({where: …, isTriggered: false})` срещу double-fire |

<!--
Валидацията е защитена в дълбочина — Zod на ниво HTTP, повторни проверки на ниво
service след merge на PATCH-овете, и runtime guards в runner-а. Това означава, че
дори ако някой бъг прескочи Zod, runner-ът пак няма да върне 500 — ще върне
структуриран AppError с код 400.
-->

---

## Какво научих и какво следва

**Какво работи добре:**
- Decimal математика → нулеви парични грешки
- In-memory alert engine → ниска латентност
- Refcounted subscriptions → ефективно използване на Kraken WS
- Server-side PDF rendering → консистентен export

**Възможни следващи стъпки:**
- Кеширане на исторически OHLC (по-малко зависимост от Kraken)
- Лимитни поръчки (limit / stop-loss), не само пазарни
- Сравнение с benchmark (vs hold-only-BTC)

<!--
Проектът беше много добра възможност да практикувам цялостен fullstack стек с
TypeScript от край до край. Най-интересни ми бяха решенията около атомарността на
сделките и архитектурата на alert engine-а. Възможни подобрения — кеширане на
исторически OHLC и поддръжка на лимитни поръчки.
-->

---

<!-- _class: lead -->

# Благодаря за вниманието!

🔗 **GitHub:** <https://github.com/danielstefanov212/CryptoSim>

**Daniel Stefanov** · ФН **0MI0600397**

<!--
Благодаря за вниманието. Целият source code е публичен на GitHub. Готов съм за въпроси.
-->
