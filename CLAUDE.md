# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint

# Database
npm run db:migrate   # Run Prisma migrations (creates/updates dev.db)
npm run db:seed      # Seed the database with sample vehicles and users
npm run db:studio    # Open Prisma Studio GUI
```

## Environment Variables

Required in `.env`:
```
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

## Architecture

This is a Next.js 16 App Router application — a Claude-powered automotive dealership assistant with role-based portals.

### User Roles & Portals

- **CUSTOMER** → `/customer/chat` (AI chat) and `/customer/financing` (loan applications)
- **SALESPERSON** → `/salesperson/dashboard`, `/salesperson/customers/[customerId]`, `/salesperson/appointments`
- **MANAGER / ADMIN** → metrics via `/api/metrics/dashboard`

Auth uses NextAuth.js with JWT sessions and bcrypt credentials. Role is stored on the JWT and checked in API routes via `getServerSession(authOptions)`.

### AI Agent Layer (`/agents/`)

Three agents, all using the Anthropic SDK with prompt caching (`buildCachedSystemBlock`):

- **`customer-chat-agent.ts`** — Streaming agentic loop. "Alex" the AI sales assistant with 6 tools: `search_inventory`, `get_vehicle_detail`, `calculate_financing`, `check_availability`, `book_appointment`, `escalate_to_salesperson`. Yields `AgentStreamEvent` objects as NDJSON.
- **`handoff-agent.ts`** — Triggered when intent threshold is crossed or `escalate_to_salesperson` tool fires. Generates a structured JSON handoff summary via Claude, assigns a salesperson (load-balanced by fewest open assignments), and creates an `Assignment` record.
- **`pricing-agent.ts`** — Provides markup/discount recommendations for salespersons.

### Intent Scoring (`/lib/intent-detector.ts`)

Each user message is scored with regex-based signals (0–0.3 per message, diminishing returns across session). When `intentScore >= HANDOFF_THRESHOLD` (0.72), auto-handoff triggers. Intent is accumulated on `ChatSession.intentScore`.

### Chat Streaming

`POST /api/chat` streams NDJSON to the client. Event types: `text`, `tool_result`, `handoff_triggered`, `handoff_complete`, `done`, `error`. The session ID is returned in the `X-Session-Id` response header.

### Data Layer

- **Prisma + SQLite** for local dev. Switch `schema.prisma` provider to `postgresql` for production.
- Key models: `User`, `Vehicle`, `ChatSession`, `Message`, `Assignment`, `Appointment`, `FinancingApplication`, `ConversionEvent`
- `Vehicle.features` and `Vehicle.imageUrls` are stored as JSON strings (SQLite has no native JSON column) — always `JSON.parse()` before use.
- `Assignment.handoffPayload` is also a JSON string.

### PII Handling

All user messages are passed through `redactPII()` (`/lib/pii.ts`) before being sent to Claude or stored as assistant-visible content.

### Prompt Caching

`lib/anthropic.ts` exports `buildCachedSystemBlock()` which adds `cache_control: { type: "ephemeral" }` to system prompts. All agents use this — don't remove it when modifying system prompts.
