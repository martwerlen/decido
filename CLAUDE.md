# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Decidoo** is a collaborative decision-making platform for organizations with multiple decision modalities (consensus, consent, weighted voting, majority, supermajority, advisory). Built with Next.js 15, TypeScript, and Prisma.

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
│   └── vote/[token]/    # Public voting API for external participants
├── auth/                 # Auth pages (signin, signup)
├── organizations/        # Organization management pages
│   ├── [slug]/          # Dynamic organization routes
│   │   ├── decisions/   # Decision management
│   │   │   ├── [decisionId]/
│   │   │   │   ├── vote/     # Voting interface (authenticated)
│   │   │   │   ├── results/  # Results display
│   │   │   │   └── admin/    # Decision administration
│   │   │   └── new/          # Create new decision
│   │   ├── members/     # Member management
│   │   ├── teams/       # Team management
│   │   └── settings/    # Organization settings
│   └── new/             # Create new organization
├── invitations/          # Invitation acceptance pages
└── vote/[token]/         # Public voting page for external participants (no auth)

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

### URL Routing Patterns

The app uses dynamic routes extensively. Key patterns:

- `/organizations/[slug]` - Organization by slug (e.g., `/organizations/acme-corp`)
- `/organizations/[slug]/decisions/[decisionId]` - View decision (uses `cuid` as ID)
- `/organizations/[slug]/decisions/[decisionId]/vote` - Vote on decision (requires authentication)
- `/organizations/[slug]/decisions/[decisionId]/results` - View results
- `/organizations/[slug]/decisions/[decisionId]/admin` - Manage decision (creator only)
- `/vote/[token]` - **Public voting page** for external participants (no authentication required)

API routes mirror this structure under `/api/organizations/[slug]/...` plus:
- `/api/vote/[token]` - Public API for external participant voting (GET to fetch decision, POST to vote)

## Critical Architecture Details

### Database Schema & Enums

**IMPORTANT**: This project uses SQLite for development, which does NOT support Prisma enums. All enum-like fields in the schema are stored as `String` types.

Type-safe enums are defined in `types/enums.ts` with corresponding validation helpers:
- `MemberRole`: 'OWNER' | 'ADMIN' | 'MEMBER'
- `InvitationStatus`: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
- `DecisionType`: 'CONSENSUS' | 'CONSENT' | 'MAJORITY' | 'SUPERMAJORITY' | 'WEIGHTED_VOTE' | 'ADVISORY'
- `DecisionStatus`: 'DRAFT' | 'OPEN' | 'CLOSED' | 'IMPLEMENTED' | 'ARCHIVED'
- `DecisionResult`: 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'WITHDRAWN'
- `VoteValue`: 'STRONG_SUPPORT' | 'SUPPORT' | 'WEAK_SUPPORT' | 'ABSTAIN' | 'WEAK_OPPOSE' | 'OPPOSE' | 'STRONG_OPPOSE' | 'BLOCK'
- `VotingMode`: 'INVITED' | 'PUBLIC_LINK'
- `ParticipantInvitedVia`: 'TEAM' | 'MANUAL' | 'EXTERNAL'
- `ConsensusVoteValue`: 'AGREE' | 'DISAGREE'

When working with these values:
1. Import types from `types/enums.ts`, NOT from `@prisma/client`
2. Use the validation helpers (e.g., `isValidDecisionType()`) when accepting user input
3. Reference label/description mappings for UI display (e.g., `DecisionTypeLabels`, `VoteValueWeights`)

### Core Business Logic: Decision Calculation

The decision calculation logic in `lib/decision-logic.ts` is the heart of the application. Each decision type has unique calculation rules:

**CONSENSUS**: Requires ALL votes to be "STRONG_SUPPORT" → APPROVED, otherwise REJECTED
- Uses special vote values: 'AGREE' | 'DISAGREE' (see `ConsensusVoteValue` in types/enums.ts)
- Supports proposal modifications by creator: `initialProposal` (immutable history) and `proposal` (current, modifiable) fields on Decision model
- When the creator modifies the proposal, a system comment is automatically created to notify participants
- Both initial and current proposals are displayed on vote/results pages if they differ

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
- **Session extension**: User ID and lastOrganizationSlug added to session via JWT callback
- **Organization memory**: The last visited organization is remembered in the session and users are redirected to it upon login

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

### Decision Voting Modes

Each decision has two possible voting modes (`votingMode` field):

**INVITED**: Traditional invitation-based voting
- Specific participants are invited through `DecisionParticipant` records
- Participants can be added via team membership (`invitedVia: 'TEAM'`), manually (`'MANUAL'`), or as external users (`'EXTERNAL'`)
- Only invited participants can vote

**PUBLIC_LINK**: Open voting via shareable URL
- Decision has a unique `publicToken` for URL access
- Anyone with the link can vote (for anonymous/public decisions)
- Used for broader consultations

### External Participant Voting (Guest Voting)

External participants (non-members) can vote through a unique token-based URL system:

**How it works:**
1. When adding external participants via the admin interface, each participant receives a unique `token` (stored in `DecisionParticipant`)
2. Upon launching a decision, external participants receive an email with a personal voting link: `/vote/{token}`
3. The token expires at the decision's `endDate` (stored in `tokenExpiresAt`)
4. External participants access a simplified voting page without authentication, sidebar, or navigation

**Database schema:**
- `DecisionParticipant.token`: Unique 64-character hex string for external participants
- `DecisionParticipant.tokenExpiresAt`: Expiration date (set to decision's endDate when launched)
- `Vote.externalParticipantId`: Links votes to external participants (userId is null)
- `ProposalVote.externalParticipantId`: Links proposal votes to external participants
- `Comment.externalParticipantId`: Links comments to external participants (userId is null)

**Public voting page (`/vote/[token]`):**
- **No authentication required** - Accessed via unique token URL
- **Minimal UI** - No organization name, no sidebar, no navigation
- **Display:** Decision title, description, context, and voting options
- **For CONSENSUS:**
  - Shows initial proposal, amended proposal, and all comments (from both internal and external participants)
  - External participants can vote (AGREE/DISAGREE), comment, or both
  - Vote and comment are both optional, but at least one is required
  - Comments appear in the same discussion thread as internal member comments
  - External participant names are displayed next to their comments
- **For MAJORITY:** Shows all proposals as radio button options
- **Vote modification:** External participants can change their vote and add new comments before the deadline
- **Confirmation:** Personalized "Thank you" message (e.g., "Vote and comment saved successfully")

**API endpoints:**
- `GET /api/vote/[token]` - Fetches decision data, existing vote, and existing comments for the token
- `POST /api/vote/[token]` - Records or updates the vote and/or comment
  - Validates token and expiration
  - Checks decision is still OPEN
  - For CONSENSUS: Accepts optional `value` (vote) and optional `comment` (at least one required)
  - Creates `Vote` with `externalParticipantId` if vote provided
  - Creates `Comment` with `externalParticipantId` if comment provided
  - For other types: Creates `Vote` or `ProposalVote` with `externalParticipantId`
  - Marks `DecisionParticipant.hasVoted = true` when vote is submitted

**Email notification:**
- Sent only to external participants (not organization members)
- Contains personal token link: `${NEXTAUTH_URL}/vote/${token}`
- Includes decision title, description, type, and deadline
- Note about link expiration date

**Security considerations:**
- Each token is unique and non-guessable (crypto.randomBytes(32))
- Tokens expire with the decision deadline
- One vote per token (enforced by unique constraint on externalParticipantId + decisionId)
- No sensitive information displayed (no organization details, no other voters)

### Proposal System (for MAJORITY votes)

When `decisionType` is 'MAJORITY', decisions use a proposal-based voting system:
1. Multiple `Proposal` records are created for the decision
2. Each proposal has a title, description, and display order
3. Users cast `ProposalVote` records (not regular `Vote` records)
4. Each user can only vote for one proposal per decision
5. The proposal with the most votes wins

### Decision Lifecycle & Status Management

**Voting Deadlines:**
- Minimum deadline: 24 hours from creation time
- The `endDate` field stores the voting deadline
- When creating or updating a decision, ensure endDate is at least 24 hours in the future

**Automatic Status Updates:**
- A decision is considered "finished" when either:
  - The `endDate` has been reached, OR
  - All participants have voted (`hasVoted = true` for all participants)
- When accessing the results page, the system automatically updates `status` from 'OPEN' to 'CLOSED' if the vote is finished
- This ensures the decision status reflects the current voting state

**Access to Results:**
- **CONSENSUS decisions**: Results are accessible at any time (even during voting)
- **MAJORITY decisions**: Results are only visible once voting is finished
- If a user tries to access results before voting is finished (MAJORITY only), they see a message explaining the restriction

**Decision Conclusion:**
- The `conclusion` field allows the decision creator to add a summary/conclusion
- Can only be edited once the voting is finished (deadline reached OR all participants have voted)
- Displayed at the end of the results page
- Supports plain text with preserved line breaks (Markdown rendering can be added later)
- Managed via dedicated endpoint: `PATCH /api/organizations/[slug]/decisions/[decisionId]/conclusion`
- The conclusion section is only visible in the admin page once voting is finished

### Invitation System

Members are invited via email using Resend:
1. Invitation created with unique token (expires in 7 days)
2. Email sent with invitation link: `/invitations/accept?token={token}`
3. Recipient can accept invitation (creates account if needed)
4. Upon acceptance, user becomes OrganizationMember

**NonUserMembers** are members without user accounts:
- Added manually by organization admins for record-keeping purposes
- Have firstName, lastName, and position fields but no user account
- Used for documenting attendance or participation of non-digital members
- Cannot log in or vote, but can be referenced in meeting minutes or decision records

## Environment Configuration

Required environment variables (see `.env.example`):
```bash
DATABASE_URL="file:./dev.db"                    # SQLite for dev
NEXTAUTH_URL="http://localhost:3000"            # App URL
NEXTAUTH_SECRET="<generate-random-secret>"      # openssl rand -base64 32
RESEND_API_KEY=""                               # Resend API key (optional for dev)
FROM_EMAIL="noreply@decidoo.fr"                 # Sender email for invitations
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

### Common Query Patterns

**Fetching organization by slug with member check:**
```typescript
const org = await prisma.organization.findUnique({
  where: { slug: params.slug },
  include: {
    members: {
      where: { userId: session.user.id }
    }
  }
})
// Check: org.members.length > 0 to verify membership
```

**Fetching decision with participation check:**
```typescript
const decision = await prisma.decision.findUnique({
  where: { id: decisionId, organizationId: org.id },
  include: {
    participants: { where: { userId: session.user.id } },
    votes: { where: { userId: session.user.id } }
  }
})
// Check participants for voting eligibility, votes for existing vote
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
