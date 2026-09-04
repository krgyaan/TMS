# TMS — Tender Management System

An internal operations platform for **Volks Energie** — covering tendering, HR, operations, CRM, finance, and analytics.

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | NestJS 11, Zod, Drizzle ORM, PostgreSQL |
| Frontend | React 19, Vite, Tailwind CSS v4, AG Grid, React Query |
| Background | BullMQ workers, Redis |
| ML/OCR | Python — Tesseract, spaCy, OpenAI, FastAPI |
| Monitoring | Grafana, Loki, Promtail, Sentry |

## Modules

- **Tendering** — RFQs, costing, bid submissions, reverse auctions, TQ management
- **HRMS** — Employee profiles, onboarding, training, assets, complaints
- **Operations** — Work orders, purchase orders, contracts, invoicing
- **CRM** — Leads, follow-ups, happy-calling, broadcasts
- **Accounts** — Imprests, loans, insurance, bank instruments (EMDs, FDR, BG)
- **Services** — AMCs, service visits, customer feedback
- **Dashboards** — Business, customer, OEM, team, and location analytics

## Getting Started

### Prerequisites

- `Node.js`, `pnpm`, `PostgreSQL`, `Redis`, `Python 3`

### Install & Run

```bash
pnpm install
cp api/.env.example api/.env    # fill in values
pnpm drizzle:migrate
pnpm db:seed
pnpm start:dev    # API (NestJS)
pnpm dev          # Web (Vite) — proxies to localhost:3000
pnpm start:worker # BullMQ worker
```

See AGENTS.md (./AGENTS.md) for full command reference.

Project Structure
- api/      — NestJS backend (TypeScript)
- web/      — React + Vite frontend
- ml-ocr/   — Python ML/OCR scripts

Monitoring
```bash
docker-compose up -d    # Grafana + Loki + Promtail
```