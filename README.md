<p align="center">
  <h1 align="center">✈️ AeroFlow</h1>
  <p align="center">
    Aviation Safety & Risk Intelligence Platform
    <br />
    <em>Real-time flight dispatch, ground operations, and safety management</em>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-under%20construction-orange?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Vercel-deploy-black?style=for-the-badge&logo=vercel" alt="Vercel" />
</p>

---

> **⚠️ Project Under Construction**
>
> AeroFlow is actively being developed. Core functionality is implemented and ready for manual testing, but some features are still being built out. Expect breaking changes. Contributions and feedback are welcome.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Fork & Clone](#1-fork--clone)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Environment Variables](#3-environment-variables)
  - [4. Database Setup](#4-database-setup)
  - [5. Run the Dev Server](#5-run-the-dev-server)
- [Deployment to Vercel](#deployment-to-vercel)
  - [1. Push to GitHub](#1-push-to-github)
  - [2. Connect to Vercel](#2-connect-to-vercel)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Configure Cron Jobs](#4-configure-cron-jobs)
  - [5. Deploy](#5-deploy)
- [Manual Testing Guide](#manual-testing-guide)
- [Project Structure](#project-structure)
- [API Routes](#api-routes)
- [Roles & Permissions](#roles--permissions)
- [Running Tests](#running-tests)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

AeroFlow is a production-oriented aviation safety and risk intelligence web application designed for managing flight dispatch operations, ground crew readiness, weather monitoring, and safety compliance. It enforces strict role-based access control, immutable audit logging, and real-time event streaming to ensure operational integrity.

### Key Features

- **Flight Dispatch Management** — Schedule, approve, and track flight dispatch operations with multi-gate safety enforcement.
- **Risk Calculation Engine** — Weighted risk scoring based on crew fatigue, weather severity, equipment status, and checklist compliance.
- **Ground Operations Dashboard** — Mobile-first interface for ground crew to complete pre-flight checklists and log shift fatigue.
- **Real-Time Alerts (SSE)** — Server-Sent Events powered by a Node EventEmitter for live dispatch status updates.
- **Weather Ingestion** — Automated weather data collection from OpenWeatherMap via Vercel Cron jobs.
- **AI Safety Drafts** — LLM-powered draft safety briefings (clearly marked as drafts, never authoritative).
- **Immutable Audit Ledger** — Every mutation is logged with user ID, action, resource, old/new state, timestamp, and IP address.
- **Manual Override System** — Operations Directors can force-approve blocked flights with mandatory justification tracking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Styling** | TailwindCSS 4 (mobile-first) |
| **Database** | PostgreSQL |
| **ORM** | Prisma 6 |
| **Authentication** | NextAuth.js v4 (Credentials Provider) |
| **Validation** | Zod |
| **Live Updates** | Server-Sent Events (SSE) |
| **Weather API** | OpenWeatherMap |
| **AI Drafting** | OpenAI API (gpt-4o-mini) |
| **Deployment** | Vercel |
| **Scheduled Jobs** | Vercel Cron |
| **Testing** | Vitest |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App Router                │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │  Pages   │  │  Layouts  │  │   API Routes     │  │
│  │ (RSC)    │  │ (Auth)    │  │ /auth /cron /sse │  │
│  └────┬─────┘  └─────┬─────┘  └────────┬─────────┘  │
│       │              │                 │             │
│  ┌────▼──────────────▼─────────────────▼──────────┐  │
│  │              Server Actions                    │  │
│  │   flight.ts  ·  crew.ts  ·  actions.ts         │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │                              │
│  ┌────────────────────▼───────────────────────────┐  │
│  │              Core Libraries                    │  │
│  │   risk.ts · auth.ts · ai.ts · events.ts        │  │
│  │   audit/ledger.ts · db.ts · validations.ts     │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │                              │
│  ┌────────────────────▼───────────────────────────┐  │
│  │          Prisma ORM → PostgreSQL               │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** ≥ 18.17 — [Download](https://nodejs.org/)
- **npm** ≥ 9 (ships with Node.js)
- **PostgreSQL** ≥ 14 — [Download](https://www.postgresql.org/download/)
- **Git** — [Download](https://git-scm.com/)
- A **Vercel** account (for deployment) — [Sign up](https://vercel.com/)

---

## Getting Started

### 1. Fork & Clone

**Fork the repository** on GitHub by clicking the "Fork" button at the top right of the repo page.

Then clone your fork locally:

```bash
git clone https://github.com/<your-username>/AeroFlow.git
cd AeroFlow
```

### 2. Install Dependencies

```bash
npm install
```

This will install all runtime and development dependencies including Next.js, Prisma, NextAuth, Zod, and TailwindCSS.

### 3. Environment Variables

Create a `.env` file in the project root. **This file is git-ignored by default and must never be committed.**

```bash
cp .env.example .env
```

Or create it manually with the following variables:

```env
# ─── Database ────────────────────────────────────────
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/aeroflow?schema=public"

# ─── NextAuth ────────────────────────────────────────
NEXTAUTH_SECRET="your-random-secret-string-here"
NEXTAUTH_URL="http://localhost:3000"

# ─── External APIs ───────────────────────────────────
OPENWEATHER_API_KEY="your-openweathermap-api-key"
OPENAI_API_KEY="your-openai-api-key"

# ─── Cron Protection ────────────────────────────────
CRON_SECRET="your-cron-secret-string"
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Random string for JWT signing ([generate one](https://generate-secret.vercel.app/32)) |
| `NEXTAUTH_URL` | ✅ | Your app's base URL (`http://localhost:3000` for local dev) |
| `OPENWEATHER_API_KEY` | ✅ | Free API key from [OpenWeatherMap](https://openweathermap.org/api) |
| `OPENAI_API_KEY` | ⚠️ | Required only for AI safety draft generation |
| `CRON_SECRET` | ✅ | Bearer token to protect the weather cron endpoint |

### 4. Database Setup

**Create the PostgreSQL database:**

```bash
createdb aeroflow
```

**Generate the Prisma client and push the schema to your database:**

```bash
npx prisma generate
npx prisma db push
```

> **Note:** `prisma db push` is used for development. For production migrations, use `npx prisma migrate dev` to create a migration history.

**Seed initial data (optional):**

If a seed file exists:
```bash
npx prisma db seed
```

If no seed file exists yet, you can manually insert a test user via Prisma Studio:
```bash
npx prisma studio
```

This opens a browser UI at `http://localhost:5555` where you can create users with different roles (`GROUND_CREW_LEAD`, `FLIGHT_DISPATCHER`, `OPERATIONS_DIRECTOR`).

### 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment to Vercel

### 1. Push to GitHub

If you haven't already, initialize git and push to your fork:

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository.
3. Select the **Next.js** framework preset (should be auto-detected).

### 3. Configure Environment Variables

In the Vercel project dashboard, navigate to **Settings → Environment Variables** and add each variable from your `.env` file:

| Key | Value | Environment |
|---|---|---|
| `DATABASE_URL` | Your hosted PostgreSQL connection string (e.g., from [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app)) | Production, Preview |
| `NEXTAUTH_SECRET` | Your secret string | Production, Preview |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Production |
| `OPENWEATHER_API_KEY` | Your API key | Production, Preview |
| `OPENAI_API_KEY` | Your API key | Production, Preview |
| `CRON_SECRET` | Your cron secret | Production, Preview |

> **Important:** You must use a hosted PostgreSQL provider for Vercel deployment. Vercel serverless functions cannot connect to `localhost`.

### 4. Configure Cron Jobs

Create or verify the `vercel.json` file in the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/weather",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

This runs the weather ingestion cron every 15 minutes. The endpoint is protected by the `CRON_SECRET` bearer token — Vercel automatically sends the `Authorization: Bearer <CRON_SECRET>` header for cron invocations.

### 5. Deploy

After pushing and configuring environment variables:

```bash
git push origin main
```

Vercel will automatically build and deploy. You can also trigger a manual deploy from the Vercel dashboard.

**Post-deployment checklist:**
- [ ] Run `npx prisma db push` against your production database (or apply migrations)
- [ ] Verify the app loads at your Vercel URL
- [ ] Create initial users via Prisma Studio connected to your production DB
- [ ] Test the authentication flow

---

## Manual Testing Guide

Follow these steps to verify the complete dispatch flow:

### Step 1 — Create Test Users

Use Prisma Studio or a database client to insert users with these roles:

| Email | Role |
|---|---|
| `crew@aeroflow.test` | `GROUND_CREW_LEAD` |
| `dispatcher@aeroflow.test` | `FLIGHT_DISPATCHER` |
| `director@aeroflow.test` | `OPERATIONS_DIRECTOR` |

### Step 2 — Create a Flight

Insert a `Flights` record with status `SCHEDULED`, linked to a `RouteProfiles` entry and at least one `FlightChecklists` with mandatory `ChecklistItems`.

### Step 3 — Ground Operations

1. Log in as `crew@aeroflow.test`.
2. Navigate to `/crew/dashboard`.
3. Complete all mandatory checklist items by clicking the checkboxes.
4. Submit a shift log with a fatigue score.

### Step 4 — Dispatch Approval

1. Log in as `dispatcher@aeroflow.test`.
2. Navigate to `/dispatcher/dashboard`.
3. Click into a flight to view its dossier at `/dispatcher/flight/[id]`.
4. Verify the risk score, weather status, and checklist completion are displayed.
5. Click **Approve Dispatch** (should succeed if risk is below critical threshold).

### Step 5 — Test Blocked Dispatch

1. Create a scenario with high fatigue (index > 8) or critical weather.
2. Verify the **Approve Dispatch** button is disabled and an error is thrown.

### Step 6 — Manual Override

1. Log in as `director@aeroflow.test`.
2. Navigate to the blocked flight's dossier.
3. Enter a justification and click **Force Override**.
4. Verify the flight status changes to `READY`.

### Step 7 — Audit Verification

1. Log in as `director@aeroflow.test`.
2. Navigate to `/director/ledger`.
3. Verify all actions (checklist completions, shift logs, approvals, overrides) are logged with correct timestamps, user IDs, and IP addresses.

---

## Project Structure

```
AeroFlow/
├── prisma/
│   └── schema.prisma          # Database schema (20+ models)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth API route
│   │   │   ├── cron/weather/        # Weather ingestion cron
│   │   │   └── sse/                 # Server-Sent Events endpoint
│   │   ├── crew/
│   │   │   └── dashboard/           # Ground operations UI
│   │   ├── dispatcher/
│   │   │   ├── dashboard/           # Dispatch overview
│   │   │   └── flight/[id]/         # Flight dossier & approval
│   │   ├── director/
│   │   │   └── ledger/              # Immutable audit log viewer
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Landing page
│   │   └── globals.css              # Global styles
│   └── lib/
│       ├── actions/
│       │   ├── crew.ts              # Checklist & shift log actions
│       │   └── flight.ts            # Dispatch approval & override
│       ├── audit/
│       │   └── ledger.ts            # Immutable audit logging
│       ├── auth.ts                  # NextAuth config & RBAC
│       ├── ai.ts                    # OpenAI draft generation
│       ├── db.ts                    # Prisma client singleton
│       ├── events.ts                # SSE EventEmitter singleton
│       ├── risk.ts                  # Risk calculation engine
│       └── validations.ts           # Zod schemas
├── tests/
│   └── unit/
│       └── risk.test.ts             # Risk engine unit tests
├── .env                             # Environment variables (git-ignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── README.md
```

---

## API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Public | NextAuth authentication endpoints |
| `/api/cron/weather` | GET | Bearer Token (`CRON_SECRET`) | Ingests weather data for active flights |
| `/api/sse` | GET | None (event stream) | Real-time Server-Sent Events for dispatch updates |

---

## Roles & Permissions

| Role | Access |
|---|---|
| `GROUND_CREW_LEAD` | `/crew/dashboard` — Complete checklists, log shift fatigue |
| `FLIGHT_DISPATCHER` | `/dispatcher/dashboard`, `/dispatcher/flight/[id]` — View flights, approve dispatch |
| `OPERATIONS_DIRECTOR` | All dispatcher routes + `/director/ledger` — Override blocked dispatches, view audit logs |

---

## Running Tests

Run the Vitest test suite:

```bash
npx vitest run
```

Run tests in watch mode:

```bash
npx vitest
```

Run a specific test file:

```bash
npx vitest run tests/unit/risk.test.ts
```

---

## Contributing

1. **Fork** the repository.
2. **Create a feature branch:** `git checkout -b feature/your-feature-name`
3. **Commit your changes:** `git commit -m "feat: add your feature"`
4. **Push to your branch:** `git push origin feature/your-feature-name`
5. **Open a Pull Request** against the `main` branch.

### Contribution Guidelines

- Follow TypeScript strict mode — no `any` types except where explicitly required.
- All Server Actions must include `requireRole()` and `logAudit()` calls.
- Never expose API keys or secrets to client components.
- Write tests for any new risk calculation logic or gating rules.
- Use conventional commit messages (`feat:`, `fix:`, `docs:`, `test:`).

---

## License

This project is currently unlicensed. A license will be added as the project matures.

---

<p align="center">
  <strong>⚠️ Project Under Construction ⚠️</strong>
  <br />
  <em>AeroFlow is being actively developed. Features, APIs, and database schemas may change without notice.</em>
</p>
