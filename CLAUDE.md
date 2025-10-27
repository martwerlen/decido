# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Decido** is a collaborative decision-making platform for organizations. It supports multiple decision-making modalities (consensus, consent, majority voting, etc.) with full traceability and member management.

**Tech Stack:**
- Next.js 15 with App Router + TypeScript
- Prisma ORM (SQLite for dev, PostgreSQL for production)
- NextAuth.js v5 (JWT-based authentication)
- Material-UI (MUI) + Tailwind CSS
- Resend for emails (optional)

## Development Commands

### Setup
```bash
npm install                       # Install dependencies
cp .env.example .env              # Create environment file
node scripts/init-database.js     # Initialize SQLite database
npm run dev                       # Start development server
```

### Common Tasks
```bash
npm run dev                       # Development server (http://localhost:3000)
npm run build                     # Production build
npm run lint                      # Lint code
npm run db:generate               # Generate Prisma client (run after schema changes)
npm run db:push                   # Push schema to DB (development)
npm run db:migrate                # Create migration (production)
npm run db:studio                 # Open Prisma Studio GUI
```

### Database
- **Development:** SQLite (`dev.db` at project root)
- **Production:** PostgreSQL
- After modifying `prisma/schema.prisma`, always run `npm run db:generate` before `npm run dev`
- Use `node scripts/init-database.js` to reset the SQLite database

## Architecture

### Directory Structure

```
app/                          # Next.js App Router
├── api/                      # API routes
│   ├── auth/                 # NextAuth handlers + signup
│   ├── organizations/        # Org CRUD + members
│   └── invitations/          # Invitation handling
├── auth/                     # Auth pages (signin, signup)
├── organizations/            # Organization pages
│   ├── [id]/members/         # Member management
│   └── new/                  # Create organization
└── invitations/              # Accept invitations

components/                   # React components
├── auth/                     # Auth forms (SignIn, SignUp)
├── dashboard/                # Dashboard component
└── providers/                # Context providers (Theme, Session)

lib/                          # Business logic & utilities
├── auth.ts                   # NextAuth configuration
├── prisma.ts                 # Prisma client singleton
├── decision-logic.ts         # Decision calculation algorithms
└── email.ts                  # Email service (Resend/console)

prisma/
└── schema.prisma             # Database schema

scripts/
├── init-database.js          # SQLite initialization script
└── create-tables.sql         # SQL schema
```

### Key Architecture Patterns

**Authentication Flow:**
- NextAuth v5 with Prisma adapter
- JWT session strategy (no database sessions)
- Credentials provider with bcrypt password hashing
- User ID injected into JWT token and session callbacks

**Database Access:**
- All DB access goes through the Prisma client in `lib/prisma.ts`
- Singleton pattern to avoid multiple instances during dev hot-reload
- Schema supports both SQLite (dev) and PostgreSQL (production)

**Email Service:**
- Dynamic import of Resend if `RESEND_API_KEY` is set
- Falls back to console logging if API key is missing
- Two email types: invitation emails and welcome emails

**Organization Membership:**
- Users have `OrganizationMember` records linking them to orgs
- Supports roles: OWNER, ADMIN, MEMBER
- `NonUserMember` model for directory members without accounts
- `Invitation` model with token-based acceptance flow

## Decision Logic (Critical Domain Knowledge)

The decision calculation logic in `lib/decision-logic.ts` implements six decision types:

### Decision Types

1. **CONSENSUS** - Requires all votes to be `STRONG_SUPPORT`
   - Result: APPROVED only if 100% strong support

2. **CONSENT** - No major objections allowed
   - BLOCKED if any vote is `BLOCK`
   - REJECTED if any vote is `STRONG_OPPOSE`
   - APPROVED otherwise

3. **MAJORITY** - Simple majority
   - Count positive vs negative votes
   - APPROVED if positive > negative

4. **SUPERMAJORITY** - Requires 2/3 support
   - APPROVED if support votes ≥ 66.67% of total votes

5. **WEIGHTED_VOTE** - Weighted score calculation
   - Each vote has a weight from -3 to +3
   - APPROVED if sum of (vote_value × weight) > 0

6. **ADVISORY** - Always approved (informational only)

### Vote Values & Weights

| Vote Value       | Symbol | Weight |
|-----------------|--------|--------|
| STRONG_SUPPORT  | ++     | +3     |
| SUPPORT         | +      | +2     |
| WEAK_SUPPORT    | ~+     | +1     |
| ABSTAIN         | 0      | 0      |
| WEAK_OPPOSE     | ~-     | -1     |
| OPPOSE          | -      | -2     |
| STRONG_OPPOSE   | --     | -3     |
| BLOCK           | 🚫     | -10    |

**Important:** The `BLOCK` vote is only valid for CONSENT decisions.

## Database Schema Notes

### Key Relationships

- **User** → **OrganizationMember** (many-to-many via join table)
- **Organization** → **Team** → **TeamMember** (nested hierarchy)
- **Decision** belongs to Organization and optionally Team
- **Vote** links User to Decision (one vote per user per decision)
- **Comment** supports threaded discussions (self-referential parent/replies)

### Status Enums

**DecisionStatus:** DRAFT → OPEN → CLOSED → IMPLEMENTED/ARCHIVED
**InvitationStatus:** PENDING → ACCEPTED/EXPIRED/CANCELLED
**DecisionResult:** APPROVED/REJECTED/BLOCKED/WITHDRAWN

## Common Development Patterns

### Creating API Routes

API routes follow Next.js 15 App Router conventions:
- Use `route.ts` files in `app/api/` directories
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`
- Access session with `auth()` from `lib/auth.ts`
- Return `NextResponse.json()` for JSON responses

Example:
```typescript
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // ... handle request
}
```

### Working with Prisma

After schema changes:
```bash
npm run db:generate    # Always run first
npm run db:push        # For development (SQLite)
# or
npm run db:migrate     # For production (creates migration)
```

### Accessing the Current User

```typescript
import { auth } from "@/lib/auth"

const session = await auth()
const userId = session?.user?.id
```

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - Database connection (SQLite file path or PostgreSQL URL)
- `NEXTAUTH_URL` - Application URL (http://localhost:3000 in dev)
- `NEXTAUTH_SECRET` - Random secret for JWT signing

Optional:
- `RESEND_API_KEY` - For sending real emails (falls back to console)
- `FROM_EMAIL` - Sender email address

## Testing & Debugging

- **Database GUI:** Run `npm run db:studio` to open Prisma Studio
- **Email Preview:** Check console logs for invitation/welcome emails in dev mode
- **Auth Debugging:** NextAuth errors appear in server console, not browser
- **Database Reset:** Run `node scripts/init-database.js` to start fresh
