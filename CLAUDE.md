# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Decido** is a collaborative decision-making platform for organizations with multiple decision modalities (consensus, consent, weighted voting, majority, supermajority, advisory). Built with Next.js 15, TypeScript, and Prisma.

## Development Commands

```bash
# Development
npm run dev                 # Start dev server on http://localhost:3000
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint

# Database (Prisma)
npm run db:generate        # Generate Prisma client (required after schema changes)
npm run db:push            # Push schema to database (dev)
npm run db:migrate         # Create and run migrations
npm run db:studio          # Open Prisma Studio (database GUI)
```

## Architecture Overview

### Stack
- **Frontend**: Next.js 15 App Router, TypeScript, Tailwind CSS, Material-UI
- **Backend**: Next.js API Routes
- **Database**: SQLite (dev) / PostgreSQL (prod) with Prisma ORM
- **Auth**: NextAuth.js v5 (beta) with JWT strategy
- **Email**: Resend (for invitations)

### Key Directories
```
app/                      # Next.js App Router
├── api/                  # API routes (auth, organizations, invitations)
├── auth/                 # Auth pages (signin, signup)
├── organizations/        # Organization management pages
└── invitations/          # Invitation acceptance pages

lib/                      # Core business logic
├── auth.ts              # NextAuth configuration
├── decision-logic.ts    # Decision calculation algorithms
├── email.ts             # Email sending with Resend
└── prisma.ts            # Prisma client instance

components/               # React components
├── auth/                # Authentication forms
├── dashboard/           # Dashboard components
└── providers/           # Context providers (Session, Theme)

types/                    # TypeScript types
├── enums.ts             # Type-safe enums (replaces Prisma enums)
├── index.ts             # Shared types
└── next-auth.d.ts       # NextAuth type extensions

prisma/
└── schema.prisma        # Database schema
```

## Critical Architecture Details

### Database Schema & Enums

**IMPORTANT**: This project uses SQLite for development, which does NOT support Prisma enums. All enum-like fields in the schema are stored as `String` types.

Type-safe enums are defined in `types/enums.ts` with corresponding validation helpers:
- `MemberRole`: 'OWNER' | 'ADMIN' | 'MEMBER'
- `DecisionType`: 'CONSENSUS' | 'CONSENT' | 'MAJORITY' | 'SUPERMAJORITY' | 'WEIGHTED_VOTE' | 'ADVISORY'
- `DecisionStatus`: 'DRAFT' | 'OPEN' | 'CLOSED' | 'IMPLEMENTED' | 'ARCHIVED'
- `DecisionResult`: 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'WITHDRAWN'
- `VoteValue`: 'STRONG_SUPPORT' | 'SUPPORT' | 'WEAK_SUPPORT' | 'ABSTAIN' | 'WEAK_OPPOSE' | 'OPPOSE' | 'STRONG_OPPOSE' | 'BLOCK'

When working with these values:
1. Import types from `types/enums.ts`, NOT from `@prisma/client`
2. Use the validation helpers (e.g., `isValidDecisionType()`) when accepting user input
3. Reference label/description mappings for UI display

### Core Business Logic: Decision Calculation

The decision calculation logic in `lib/decision-logic.ts` is the heart of the application. Each decision type has unique calculation rules:

**CONSENSUS**: Requires ALL votes to be "STRONG_SUPPORT" → APPROVED, otherwise REJECTED

**CONSENT**: Blocked by any "BLOCK" vote → BLOCKED; Rejected by "STRONG_OPPOSE" → REJECTED; Otherwise APPROVED

**MAJORITY**: Simple majority → APPROVED if (support votes > oppose votes)

**SUPERMAJORITY**: Requires 2/3 of votes to be supportive → APPROVED if (support votes ≥ 2/3 total)

**WEIGHTED_VOTE**: Calculates weighted score using vote weights (-3 to +3) → APPROVED if score > 0

**ADVISORY**: Always returns APPROVED (informational only)

Vote weights are defined in `getVoteWeight()`:
- STRONG_SUPPORT: +3, SUPPORT: +2, WEAK_SUPPORT: +1
- ABSTAIN: 0
- WEAK_OPPOSE: -1, OPPOSE: -2, STRONG_OPPOSE: -3
- BLOCK: -10 (only valid in CONSENT decisions)

### Authentication Flow

NextAuth v5 (beta) configuration in `lib/auth.ts`:
- **Strategy**: JWT (not database sessions)
- **Provider**: Credentials (email + bcrypt-hashed password)
- **Custom pages**: `/auth/signin`, `/auth/signup`
- **Session extension**: User ID added to session via JWT callback

Protected routes require session check:
```typescript
// Server Component
import { auth } from "@/lib/auth"
const session = await auth()
if (!session) redirect("/auth/signin")

// API Route
import { auth } from "@/lib/auth"
const session = await auth()
if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
```

### Multi-Organization Structure

Users can belong to multiple organizations with different roles:
1. **Organization** → has members and teams
2. **OrganizationMember** → links User to Organization with a role
3. **Team** → subset of organization members
4. **TeamMember** → links OrganizationMember to Team

Decisions can be organization-wide or team-specific (optional `teamId` field).

### Invitation System

Members are invited via email using Resend:
1. Invitation created with unique token (expires in 7 days)
2. Email sent with invitation link: `/invitations/accept?token={token}`
3. Recipient can accept invitation (creates account if needed)
4. Upon acceptance, user becomes OrganizationMember

**NonUserMembers** are members without accounts (added manually for record-keeping).

## Environment Configuration

Required environment variables (see `.env.example`):
```bash
DATABASE_URL="file:./dev.db"                    # SQLite for dev
NEXTAUTH_URL="http://localhost:3000"            # App URL
NEXTAUTH_SECRET="<generate-random-secret>"      # openssl rand -base64 32
RESEND_API_KEY=""                               # Resend API key (optional for dev)
FROM_EMAIL="noreply@decido.app"                 # Sender email for invitations
```

## Important Conventions

### Path Aliases
Use `@/*` for imports from project root:
```typescript
import { prisma } from "@/lib/prisma"
import { DecisionType } from "@/types/enums"
```

### API Routes
API routes return JSON with consistent error handling:
```typescript
// Success
return Response.json({ data: result })

// Error
return Response.json({ error: "Error message" }, { status: 400 })
```

### Database Queries
Always use the singleton Prisma client from `lib/prisma.ts`:
```typescript
import { prisma } from "@/lib/prisma"
```

## Known Issues & Workarounds

### Prisma Client Generation
If you encounter 403 errors from `binaries.prisma.sh`, the Prisma client may need to be generated on a machine with full internet access and then transferred. See `FIX_PRISMA_ENUMS.md` for detailed workarounds.

### Email in Development
If `RESEND_API_KEY` is not configured, invitation emails will fail silently. For local development, manually construct invitation URLs or use a test Resend account.

## Testing Decision Logic

A test file exists at `test-decision-logic.js` for validating decision calculations:
```bash
node test-decision-logic.js
```

This tests all decision types with various vote scenarios.
