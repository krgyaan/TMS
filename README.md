# Project Structure

## Backend (`api/`) - NestJS

- **Drizzle ORM**: Over 52 migrations
- **Modular Architecture**, with major domains:
    - **auth**: Authentication, roles, permissions
    - **tendering**: Tenders, EMDs, RFQs, bids, costing
    - **master**: Companies, locations, vendors, items
    - **accounts**: Imprests, loan parties
    - **crm**: Leads, follow-ups
    - **shared**: Couriers, follow-ups, enums

## Frontend (`web/`) - React + Vite

- **UI**: [shadcn/ui](https://ui.shadcn.com/) components
- **Feature Modules**: Mirror backend domains
- **Custom Hooks**: `/hooks/api/` for each entity
- **Services Layer**: `/services/api/`
- **Routes**: Organized by domain

## Machine Learning & OCR (`ml-ocr/`) - Python

- **OCR Text Extraction**
- **LLM Post-processing**
- **Self-hosted LLM Integration**

---

## Key Patterns

- **Zod Schemas** for validation (API)
- **React Query** for data fetching (Web)
- **Permission-based Access Control**
- **Team-based Multi-tenancy**
- **Status Workflow Management** for tenders
