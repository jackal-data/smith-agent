# Smith Motors — AI Dealership Agent

A full-stack Claude-powered dealership platform for mid-size car dealers.

## Features

- **AI Customer Chat** — Claude-powered assistant (Alex) handles make/model/VIN queries, financing calculations, test drive bookings, and buying intent detection
- **Automatic Handoff** — When intent score ≥ 72% or customer requests it, chat auto-escalates to a salesperson with an AI-generated summary
- **Salesperson Dashboard** — View assigned customers, chat summaries, vehicles of interest, and AI markup recommendations
- **AI Pricing Advisor** — Recommends how much over MSRP to open negotiations based on intent signals, urgency, and inventory
- **Financing Calculator** — Real-time payment scenarios by credit tier and term
- **Document Workflow** — Document checklist and upload for financing applications
- **CRM Sync** — Pluggable CRM adapter (NullAdapter by default, swap in Salesforce/HubSpot)
- **Metrics Dashboard** — Conversion rate, handoff rate, time-to-close, avg intent score

## Stack

- **Frontend/Backend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database**: Prisma ORM + SQLite (swap to PostgreSQL for production)
- **AI**: Claude Sonnet 4.6 (chat + handoff + pricing) with prompt caching
- **Auth**: NextAuth v4 (credentials provider, JWT sessions)

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local

# Run migrations and seed
DATABASE_URL="file:./dev.db" npx prisma migrate dev
DATABASE_URL="file:./dev.db" npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| `demo@customer.com` | `customer123` | Customer |
| `alex@smithmotors.com` | `sales1234` | Salesperson |
| `morgan@smithmotors.com` | `sales1234` | Salesperson |
| `manager@smithmotors.com` | `sales1234` | Manager |

Salesperson registration key: `smith-sales-2024`

## Environment Variables

```env
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="sk-ant-..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
CRM_PROVIDER="null"        # null | salesforce | hubspot
STORAGE_PROVIDER="local"   # local | s3
SALESPERSON_REGISTRATION_KEY="smith-sales-2024"
```

## Architecture

```
app/
├── (auth)/login + register       # Auth pages
├── customer/chat                 # Customer AI chat interface
├── customer/financing            # Financing calculator + doc upload
├── salesperson/dashboard         # Assigned customers overview
├── salesperson/customers/[id]    # Customer detail + chat transcript
├── salesperson/appointments      # Appointment management
└── api/                          # All API routes

agents/
├── customer-chat-agent.ts        # Claude chat with 6 tools
├── handoff-agent.ts              # AI handoff summary + salesperson assignment
└── pricing-agent.ts              # Markup recommendation AI

lib/
├── anthropic.ts                  # SDK singleton + prompt cache helpers
├── prisma.ts                     # DB client singleton
├── auth.ts                       # NextAuth config
├── intent-detector.ts            # Buying intent scoring
├── pii.ts                        # PII redaction
└── crm-adapter.ts                # CRM integration interface
```

## Prompt Caching

Three system prompts use `cache_control: { type: "ephemeral" }`:
- Customer chat agent system prompt (~2,000 tokens)
- Handoff summarization instructions (~800 tokens)
- Pricing recommendation guidelines (~600 tokens)

Cache hits on every message in an active conversation, reducing latency and cost significantly.
