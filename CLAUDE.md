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

### Visual Identity & Design System

**Brand Assets:**
- Logo: `/public/logo.svg` (Decidoo logo with the two "o"s in brand colors)
- Favicon: `/public/favicon.png`

**Typography:**
- Font family: Poppins (via Next.js Font Optimization)
- Weights: 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- Font variable: `--font-poppins` (configured in `app/layout.tsx`)

**Color Palette (Light Mode):**
- **Primary (Vert Nature):** `#4a7c59` - Main brand color for CTAs, logos
- **Secondary (Orange Terre):** `#d4896b` - Warm accents
- **Accent (Rouge Doux):** `#cb6e5e` - Priority decisions, soft alerts
- **Text Primary:** `#2d3a2d` - Main text (dark green)
- **Text Secondary:** `#5a6d5a` - Secondary text
- **Background Primary:** `#ffffff` - Main background
- **Background Secondary:** `#f9faf9` - Cards, paper
- **Borders:** `#e5ebe5` (light), `#d0d8d0` (medium)

**Color Palette (Dark Mode):**
- **Primary:** `#5da370` - Slightly brighter green for dark backgrounds
- **Secondary:** `#e5a484` - Warmer orange for better contrast
- **Accent:** `#d88777` - Soft red adapted for dark mode
- **Text Primary:** `#e8ede8` - Light text
- **Text Secondary:** `#b8c4b8` - Muted light text
- **Background Primary:** `#1a2520` - Deep green-tinted dark background
- **Background Secondary:** `#243329` - Slightly lighter dark surface
- **Borders:** `#3d4f45` (light), `#4a5d52` (medium)

**Design System Implementation:**
1. **CSS Variables:** All colors are defined as CSS custom properties in `app/globals.css`
   - Light mode: `:root { --color-primary: #4a7c59; ... }`
   - Dark mode: `[data-theme="dark"] { --color-primary: #5da370; ... }`

2. **Tailwind Configuration:** Colors exposed via Tailwind classes in `tailwind.config.ts`
   - Usage: `bg-primary`, `text-primary`, `border-light`, etc.

3. **Material-UI Theme:** Complete theme configuration in `components/providers/ThemeProvider.tsx`
   - Customized components: Button, Card, Paper, TextField, Chip
   - Typography variants with Poppins font
   - Automatic dark mode support via `DarkModeProvider`

**Dark Mode System:**
- Provider: `components/providers/DarkModeProvider.tsx`
- Hook: `useDarkMode()` - provides `{ isDarkMode, toggleDarkMode, setDarkMode }`
- Storage: User preference saved in localStorage
- Toggle: Available in user profile settings (`/settings/profile`)
- Theme attribute: `data-theme="dark"` applied to `<html>` element

**Component Styling Best Practices:**
- Use Material-UI components for consistency (Button, Card, TextField, etc.)
- Prefer MUI theme colors over hardcoded values
- For custom components, use Tailwind with theme colors
- Typography: Use MUI Typography component with proper variants
- Buttons: Primary (contained), Secondary (outlined), Accent (for important actions)
- Cards: 12px border-radius, 2px solid border, subtle shadow
- Spacing: Consistent use of MUI spacing units (multiples of 8px)

### Key Directories
```
app/                      # Next.js App Router
├── api/                  # API routes
│   ├── organizations/   # Organization-scoped APIs
│   │   └── [slug]/
│   │       └── decisions/
│   │           ├── route.ts                    # Create decision
│   │           ├── check-public-slug/          # Check slug availability
│   │           └── [decisionId]/
│   │               ├── stats/                  # Vote statistics
│   │               └── close/                  # Close decision
│   └── vote/             # Public voting APIs (no auth)
│       ├── [token]/      # Token-based voting (external participants)
│       └── [orgSlug]/[publicSlug]/  # Anonymous voting (PUBLIC_LINK mode)
├── auth/                 # Auth pages (signin, signup)
├── organizations/        # Organization management pages
│   ├── [slug]/          # Dynamic organization routes
│   │   ├── decisions/   # Decision management
│   │   │   ├── [decisionId]/
│   │   │   │   ├── vote/     # Voting interface (authenticated)
│   │   │   │   ├── results/  # Results display
│   │   │   │   ├── admin/    # Decision administration (INVITED mode)
│   │   │   │   └── share/    # Share page with link/QR code (PUBLIC_LINK mode)
│   │   │   └── new/          # Create new decision
│   │   ├── members/     # Member management
│   │   ├── teams/       # Team management
│   │   └── settings/    # Organization settings
│   └── new/             # Create new organization
├── invitations/          # Invitation acceptance pages
└── vote/                 # Public voting pages (no auth)
    ├── [token]/          # Token-based voting for external participants
    └── [orgSlug]/[publicSlug]/  # Anonymous voting (PUBLIC_LINK mode)

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

**Authenticated routes (requires login):**
- `/organizations/[slug]` - Organization by slug (e.g., `/organizations/acme-corp`)
- `/organizations/[slug]/decisions/[decisionId]` - View decision (uses `cuid` as ID)
- `/organizations/[slug]/decisions/[decisionId]/vote` - Vote on decision (authenticated members)
- `/organizations/[slug]/decisions/[decisionId]/results` - View results
- `/organizations/[slug]/decisions/[decisionId]/admin` - Post-launch decision management (creator only, INVITED mode)
- `/organizations/[slug]/decisions/[decisionId]/share` - Share page with public link and QR code (creator only, PUBLIC_LINK mode)
- `/organizations/[slug]/decisions/new` - Create new decision

**Public routes (no authentication required):**
- `/vote/[token]` - External participant voting page (token-based, for INVITED mode with external participants)
- `/public-vote/[orgSlug]/[publicSlug]` - **Anonymous public voting page** (for PUBLIC_LINK mode)

**API routes:**

Authenticated APIs (under `/api/organizations/[slug]/...`):
- `POST /api/organizations/[slug]/decisions` - Create new decision
- `GET /api/organizations/[slug]/decisions/check-public-slug?slug=xxx` - Check slug availability
- `GET /api/organizations/[slug]/decisions/[decisionId]/stats` - Get vote statistics (creator only)
- `PATCH /api/organizations/[slug]/decisions/[decisionId]/close` - Close decision manually (creator only)
- `POST /api/organizations/[slug]/decisions/[decisionId]/opinions` - Submit/update opinion (ADVICE_SOLICITATION)
- `GET /api/organizations/[slug]/decisions/[decisionId]/opinions` - Get all opinions (ADVICE_SOLICITATION)
- `PATCH /api/organizations/[slug]/decisions/[decisionId]/validate` - Validate final decision (ADVICE_SOLICITATION, creator only)
- `PATCH /api/organizations/[slug]/decisions/[decisionId]/withdraw` - Withdraw decision (all types, creator only, sets status=CLOSED and result=WITHDRAWN)

Public APIs:
- `GET /api/vote/[token]` - Fetch decision data for external participant (token-based)
- `POST /api/vote/[token]` - Submit vote for external participant (token-based)
- `GET /api/public-vote/[orgSlug]/[publicSlug]` - Fetch decision data for anonymous voting
- `POST /api/public-vote/[orgSlug]/[publicSlug]` - Submit anonymous vote

### Sidebar Architecture

The sidebar (`components/dashboard/Sidebar.tsx`) displays organization decisions in two main categories:

**1. En cours (Ongoing Decisions)** - All decisions with status `OPEN`
   - Decisions are differentiated by icons based on user participation:
     - **Horloge (AccessTime)** - User is invited but hasn't voted yet (participation required)
     - **Pouce levé (ThumbUp)** - User has already voted
     - **Œil (Visibility)** - User is not a participant (decision doesn't concern them)

**2. Terminées (Completed Decisions)** - Decisions with status `CLOSED`, `IMPLEMENTED`, `ARCHIVED`, or `WITHDRAWN`
   - Decisions are differentiated by icons based on their outcome:
     - **Stop rouge (Cancel)** - Decision was withdrawn (`status = WITHDRAWN`)
     - **Warning orange (ErrorOutline)** - Decision failed (`result = REJECTED` or `BLOCKED`)
     - **Check vert (CheckCircle)** - Decision was approved (`result = APPROVED`)

**Key Features:**
- **Auto-refresh**: The sidebar automatically refreshes when a user votes or a decision status changes, using the `SidebarRefreshProvider` context
- **Dynamic display**: Number of visible decisions is calculated dynamically based on available height to prevent scrolling within the sidebar
- **Overflow indicator**: Shows "⋯" (MoreHoriz icon) when there are more decisions than can fit, clicking redirects to the organization home page
- **Compact design**: Uses smaller font size (caption variant) and tighter spacing to fit more items
- **Ordered by creation**: Decisions are ordered by `createdAt` (desc) in both categories

**API Endpoint:**
- `GET /api/organizations/[slug]/decisions/sidebar` - Returns decisions grouped by category with participation status

**Refresh System:**
- The `SidebarRefreshProvider` context (in `components/providers/SidebarRefreshProvider.tsx`) provides a `refreshSidebar()` function
- This function is called after votes are submitted (in `VotePageClient.tsx`) to trigger an immediate sidebar update
- The sidebar listens to the `refreshTrigger` state change to re-fetch decisions

**Navigation & Permissions:**
- Changing organization from the dropdown always redirects to `/organizations/[slug]` to ensure proper page refresh
- The "Paramètres de l'organisation" menu option is only visible to users with OWNER or ADMIN role
- User role is determined by checking the `OrganizationMember` relationship with the current organization

## Critical Architecture Details

### Database Schema & Enums

**IMPORTANT**: This project uses SQLite for development, which does NOT support Prisma enums. All enum-like fields in the schema are stored as `String` types.

Type-safe enums are defined in `types/enums.ts` with corresponding validation helpers:
- `MemberRole`: 'OWNER' | 'ADMIN' | 'MEMBER'
- `InvitationStatus`: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
- `DecisionType`: 'CONSENSUS' | 'CONSENT' | 'MAJORITY' | 'SUPERMAJORITY' | 'WEIGHTED_VOTE' | 'NUANCED_VOTE' | 'ADVISORY' | 'ADVICE_SOLICITATION'
- `DecisionStatus`: 'DRAFT' | 'OPEN' | 'CLOSED' | 'IMPLEMENTED' | 'ARCHIVED'
- `DecisionResult`: 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'WITHDRAWN'
- `VoteValue`: 'STRONG_SUPPORT' | 'SUPPORT' | 'WEAK_SUPPORT' | 'ABSTAIN' | 'WEAK_OPPOSE' | 'OPPOSE' | 'STRONG_OPPOSE' | 'BLOCK'
- `VotingMode`: 'INVITED' | 'PUBLIC_LINK'
- `ParticipantInvitedVia`: 'TEAM' | 'MANUAL' | 'EXTERNAL'
- `ConsensusVoteValue`: 'AGREE' | 'DISAGREE'
- `NuancedScale`: '3_LEVELS' | '5_LEVELS' | '7_LEVELS' (échelles pour le vote nuancé)
- `NuancedMention3`: 'GOOD' | 'PASSABLE' | 'INSUFFICIENT' (mentions pour 3 niveaux)
- `NuancedMention5`: 'EXCELLENT' | 'GOOD' | 'PASSABLE' | 'INSUFFICIENT' | 'TO_REJECT' (mentions pour 5 niveaux)
- `NuancedMention7`: 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'PASSABLE' | 'INSUFFICIENT' | 'VERY_INSUFFICIENT' | 'TO_REJECT' (mentions pour 7 niveaux)
- `DecisionLogEventType`: 'CREATED' | 'LAUNCHED' | 'STATUS_CHANGED' | 'CLOSED' | 'REOPENED' | 'TITLE_UPDATED' | 'DESCRIPTION_UPDATED' | 'CONTEXT_UPDATED' | 'DEADLINE_UPDATED' | 'PROPOSAL_AMENDED' | 'CONCLUSION_ADDED' | 'PARTICIPANT_ADDED' | 'PARTICIPANT_REMOVED' | 'VOTE_RECORDED' | 'VOTE_UPDATED' | 'COMMENT_ADDED' | 'OPINION_SUBMITTED' | 'OPINION_UPDATED' | 'FINAL_DECISION_MADE' (types d'événements pour l'historique des décisions)

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

**NUANCED_VOTE** (Jugement Majoritaire): Each participant evaluates all proposals with a mention from a predefined scale
- Three scales available: 3, 5, or 7 levels
- **3 levels**: "Pour" (For), "Sans avis" (Neutral), "Contre" (Against)
- **5 levels**: "Franchement pour" (Strongly for), "Pour" (For), "Sans avis" (Neutral), "Contre" (Against), "Franchement contre" (Strongly against)
- **7 levels**: "Absolument pour" (Absolutely for), "Franchement pour" (Strongly for), "Pour" (For), "Sans avis" (Neutral), "Contre" (Against), "Franchement contre" (Strongly against), "Absolument contre" (Absolutely against)
- Each scale has a symmetric structure: N positive mentions, 1 neutral mention, N negative mentions
- The median mention (mention médiane) is calculated for each proposal
- **Winner determination**: The winner is the proposal with the most positive mentions and fewest negative mentions
- **Tie-breaking**: If tied, compare extreme mentions first (absolutely for/against), then progressively move to central mentions
- **Multiple winners**: The creator can specify how many winning proposals they want (e.g., top 3)
- Results are displayed with a segmented horizontal bar showing the distribution of all mentions with color gradients (green for positive, yellow for neutral, orange/red for negative)

**ADVISORY**: Always returns APPROVED (informational only)

**ADVICE_SOLICITATION** (Sollicitation d'avis): Individual decision-making with opinion gathering
- The decision creator shares a decision intention and solicits opinions from competent and/or impacted people
- **No deadline**: The creator controls when to close or validate the decision
- **No PUBLIC_LINK mode**: Only INVITED mode is supported
- **Minimum participants required**:
  - 1 member organization → must invite at least 1 external participant
  - 2-4 member organization → must solicit at least 1 person (internal or external)
  - 5+ member organization → must solicit at least 3 people (internal or external)
- **Opinion collection**: Each solicited participant provides a written opinion (stored in `OpinionResponse` table)
- **Intention modification**: Creator can modify the decision intention ONLY before the first opinion is submitted
- **All members can view**: All organization members can see the decision and comment, but only solicited participants can give opinions
- **Final decision**: Creator validates the final decision (stored in `conclusion` field) after receiving all opinions
- **Two possible outcomes**:
  - `WITHDRAWN`: Creator withdraws the decision at any time (status = CLOSED, result = WITHDRAWN)
  - `APPROVED`: Creator validates final decision after all opinions received (status = CLOSED, result = APPROVED)
- **Results visibility**: Accessible at any time to all organization members (no deadline restriction)

Vote weights are defined in `getVoteWeight()`:
- STRONG_SUPPORT: +3, SUPPORT: +2, WEAK_SUPPORT: +1
- ABSTAIN: 0
- WEAK_OPPOSE: -1, OPPOSE: -2, STRONG_OPPOSE: -3
- BLOCK: -10 (only valid in CONSENT decisions)

### Decision Audit Trail (DecisionLog)

The application maintains a comprehensive audit trail of all decision-related events in the `DecisionLog` table. Logging is handled by the `lib/decision-logger.ts` module.

**Events Currently Logged:**

| Event Category | Event Type | When Logged | Includes Actor Info |
|----------------|------------|-------------|---------------------|
| **Lifecycle** | CREATED | Decision creation | ✓ Yes |
| | LAUNCHED | Decision launched (manual or auto) | ✓ Yes |
| | CLOSED | Decision closed (manual or automatic) | ✓ Yes (+ reason in metadata) |
| **Modifications** | TITLE_UPDATED | Title changed | ✓ Yes (+ old/new values) |
| | DESCRIPTION_UPDATED | Description changed | ✓ Yes |
| | DEADLINE_UPDATED | End date changed | ✓ Yes (+ old/new values) |
| | PROPOSAL_AMENDED | Proposal amended (CONSENSUS only) | ✓ Yes |
| | CONCLUSION_ADDED | Conclusion added | ✓ Yes |
| **Votes** | VOTE_RECORDED | New vote submitted | Depends on decision type* |
| | VOTE_UPDATED | Vote modified | Depends on decision type* |
| **Opinions** | OPINION_SUBMITTED | Opinion submitted (ADVICE_SOLICITATION) | ✓ Yes |
| | OPINION_UPDATED | Opinion modified (ADVICE_SOLICITATION) | ✓ Yes |
| | FINAL_DECISION_MADE | Final decision validated (ADVICE_SOLICITATION) | ✓ Yes |
| **Comments** | COMMENT_ADDED | Comment posted | ✓ Yes (authenticated users only) |

**Vote Logging by Decision Type & Voting Mode:**
- **CONSENSUS** (authenticated): Logs actor name, email, and vote value (AGREE/DISAGREE) in metadata
- **MAJORITY/NUANCED_VOTE** (authenticated): Logs anonymously (no actor information, for privacy)
- **ADVICE_SOLICITATION**: Logs actor name and email for OPINION_SUBMITTED, OPINION_UPDATED, and FINAL_DECISION_MADE events
- **PUBLIC_LINK** (anonymous voting): Logs anonymously with message "Un vote a été enregistré" (no IP or user data)
- **INVITED with external participants**: Not currently logged (see DECISIONLOG_ANALYSIS.md for improvement recommendations)

**Automatic Closure Logging:**
When a decision is automatically closed (via results page access), the `reason` is stored in metadata:
- `'deadline_reached'`: The end date was reached
- `'all_voted'`: All participants have voted
- `'manual'`: Creator manually closed the decision

**Access to Logs:**
- Logs are accessible via `GET /api/organizations/[slug]/decisions/[decisionId]/history`
- Only organization members can access decision history
- Logs are displayed in reverse chronological order (most recent first)

**Note:** See `/DECISIONLOG_ANALYSIS.md` for a comprehensive analysis of logging coverage and recommendations for future improvements.

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

**PUBLIC_LINK**: Anonymous voting via shareable public URL
- Decision has a unique `publicSlug` (3-50 characters, unique per organization)
- Decision has a unique `publicToken` (64-character hex string for security)
- Anyone with the link can vote anonymously (no authentication required)
- Votes are tracked by IP address (hashed with SHA-256 for anonymity)
- Used for broader consultations, surveys, and public decision-making

**Key differences between INVITED and PUBLIC_LINK modes:**
- **INVITED**: Requires participant management, authenticated votes, full tracking of who voted
- **PUBLIC_LINK**: No participant management, anonymous votes, IP-based rate limiting

### Anonymous Voting System (PUBLIC_LINK Mode)

The anonymous voting system allows organizations to create public decision votes accessible via a simple URL without requiring authentication.

**How it works:**

1. **Creation**: When creating a decision, users can choose "Vote anonyme via URL" mode
   - Must provide a `publicSlug` (3-50 chars, lowercase, numbers, hyphens only)
   - Slug is validated for uniqueness within the organization
   - A `publicToken` is automatically generated for security
   - No participants are added to the decision (unlike INVITED mode)

2. **Sharing**: After creation, user is redirected to `/organizations/[slug]/decisions/[decisionId]/share`
   - Page displays the public vote URL: `/public-vote/{organizationSlug}/{publicSlug}`
   - Provides a QR code for easy sharing (generated with qrcode.react)
   - Shows real-time statistics (number of votes received)
   - Creator can close the decision manually or view results at any time

3. **Voting**: Anonymous voters access `/public-vote/{orgSlug}/{publicSlug}`
   - No authentication required, minimal UI (no sidebar, no organization branding)
   - Vote interface adapts to decision type (CONSENSUS, MAJORITY, NUANCED_VOTE)
   - IP address is hashed (SHA-256) and stored in `AnonymousVoteLog` table
   - One vote per IP address (can be updated before deadline)
   - Vote data stored in `Vote`, `ProposalVote`, or `NuancedVote` tables with `userId = null` and `externalParticipantId = null`

4. **Results**: Calculated the same way as INVITED mode decisions
   - Anonymous votes are counted alongside authenticated votes
   - Results visible to creator at any time
   - Public can view results if decision is closed (depending on settings)

**Database schema:**
- `Decision.publicSlug`: Human-readable slug for URL (unique per organization)
- `Decision.publicToken`: Random token for additional security
- `Decision.votingMode`: 'INVITED' or 'PUBLIC_LINK'
- `AnonymousVoteLog`: Tracks IP hashes to prevent duplicate voting
  - `decisionId`: Links to Decision
  - `ipHash`: SHA-256 hash of voter's IP address
  - `votedAt`: Timestamp of vote
  - Unique constraint on `(decisionId, ipHash)`

**Public voting URL structure:**
```
/public-vote/{organizationSlug}/{publicSlug}
```

**API endpoints:**
- `GET /api/organizations/[slug]/decisions/check-public-slug?slug=xxx` - Check slug availability
- `GET /api/public-vote/[orgSlug]/[publicSlug]` - Fetch decision data for public voting (optional)
- `POST /api/public-vote/[orgSlug]/[publicSlug]` - Submit anonymous vote
- `GET /api/organizations/[slug]/decisions/[decisionId]/stats` - Real-time statistics (creator only)
- `PATCH /api/organizations/[slug]/decisions/[decisionId]/close` - Manually close decision (creator only)

**Share page features** (`/organizations/[slug]/decisions/[decisionId]/share`):
- Display public vote URL with copy button
- Generate and download QR code
- Real-time vote count (refreshes every 10 seconds)
- Manual close button (closes voting immediately)
- View results button
- Only accessible to decision creator
- Only shown for PUBLIC_LINK decisions

**Security and rate limiting:**
- IP address is hashed before storage (SHA-256)
- One vote per IP address per decision
- IP hash prevents tracking individual voters
- Votes can be modified before deadline
- No CAPTCHA (can be added later if needed)
- Client IP extracted from `x-forwarded-for` or `x-real-ip` headers

**Frontend validation:**
- Slug format: lowercase, numbers, hyphens only, 3-50 characters
- Real-time slug availability check as user types
- Visual feedback (✓ available / ✗ already used)
- Preview of final URL before creation

**Creator capabilities for PUBLIC_LINK decisions:**
- Cannot add/remove participants (no participant management)
- Can manually close the decision at any time
- Can view results at any time (even during voting)
- Can share the link and QR code
- Sees real-time vote count statistics
- Cannot see individual voter information (votes are anonymous)

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

### Decision Creation Flow

The decision creation process has been streamlined into a single page experience where all configuration is done before launching the decision.

**New Workflow (Streamlined):**

1. **Navigate to `/organizations/[slug]/decisions/new`**
   - Server-side page loads teams, members, and organization data
   - If `?draft=<id>` parameter present, loads existing draft

2. **Fill in all decision details on one page:**
   - **Basic information**: Title, description, context
   - **Decision type**: CONSENSUS, MAJORITY, NUANCED_VOTE, or ADVICE_SOLICITATION
   - **Mode of participation** (except ADVICE_SOLICITATION): INVITED or PUBLIC_LINK
   - **Type-specific fields**:
     - CONSENSUS: Initial proposal (text)
     - ADVICE_SOLICITATION: Decision intention (text)
     - MAJORITY: List of proposals (min 2, max 25)
     - NUANCED_VOTE: List of proposals + scale selection (3/5/7 levels) + winner count
   - **Participants** (INVITED mode only):
     - Select teams (automatically includes all team members)
     - Select individual members
     - Add external participants (name + email)
   - **End date** (required except for ADVICE_SOLICITATION)

3. **Two action buttons:**
   - **"Enregistrer en brouillon"**: Saves with `status='DRAFT'`, user can continue later
   - **"Lancer la décision"**: Creates with `status='OPEN'`, sends invitation emails, redirects to `/vote`

**Technical Implementation:**

**API Endpoint (`POST /api/organizations/[slug]/decisions`):**
- Accepts all decision fields in a single request
- New `launch` parameter (boolean):
  - `launch=false`: Creates draft (`status='DRAFT'`)
  - `launch=true`: Creates and launches (`status='OPEN'`, sends emails)
- New `participants` parameter (object):
  ```typescript
  {
    teamIds: string[],          // IDs of teams to invite
    memberIds: string[],         // IDs of individual members
    externalParticipants: Array<{
      name: string,
      email: string
    }>
  }
  ```
- Validates all requirements before creating decision
- Creates `DecisionParticipant` records with tokens for external participants
- For `launch=true`: Sends invitation emails to external participants immediately
- Logs CREATED and (if launched) LAUNCHED events

**Page Structure:**
- Server component: `app/organizations/[slug]/decisions/new/page.tsx`
  - Fetches teams, members, organization member count
  - Loads draft if `?draft=<id>` parameter present
  - Passes data to client component
- Client component: `app/organizations/[slug]/decisions/new/NewDecisionClient.tsx`
  - ~1000 lines with complete form logic
  - Material-UI components with Accordions for participant selection
  - Client-side validation before submission
  - Handles both draft save and launch actions

**Validation:**
- **For drafts**: Only requires title
- **For launch**: Full validation including:
  - All required fields based on decision type
  - Minimum 2 proposals for MAJORITY/NUANCED_VOTE
  - At least 1 participant for INVITED mode
  - ADVICE_SOLICITATION minimum participant requirements:
    - 1 member org → min 1 external participant
    - 2-4 member org → min 1 participant (internal or external)
    - 5+ member org → min 3 participants (internal or external)
  - End date at least 24h in future (except ADVICE_SOLICITATION)

**Dashboard Integration:**
- Drafts displayed in "Brouillons" section
- **Continue** button → redirects to `/organizations/[slug]/decisions/new?draft=<id>`
- **Delete** button → calls `DELETE /api/organizations/[slug]/decisions/[decisionId]`

**Key Changes from Old Flow:**
- ❌ Removed: Auto-save on blur
- ❌ Removed: Two-step process (create → configure participants on /admin)
- ✅ Added: Single-page creation with integrated participant selection
- ✅ Added: Direct launch from creation page
- ✅ Added: Immediate redirect to /vote after launch

**Admin Page Post-Launch Management:**

The `/admin` page has been simplified to focus only on post-launch actions (no longer used for initial configuration):

**Actions available per decision type:**
- **CONSENSUS**:
  - View participants with vote status
  - Amend proposal (while decision is OPEN)
  - Add conclusion (when voting finished)
  - "Voir la décision en cours" button
  - "Retirer la décision" button
  
- **MAJORITY / NUANCED_VOTE**:
  - View participants with vote status
  - Add conclusion (when voting finished)
  - "Voir le vote" button
  - "Retirer la décision" button
  
- **ADVICE_SOLICITATION**:
  - Modify decision intention (only before first opinion received)
  - View solicited participants with opinion status
  - Validate final decision (when all opinions received)
  - "Voir la décision en cours" button
  - "Retirer la décision" button

**Withdraw Decision:**
- New endpoint: `PATCH /api/organizations/[slug]/decisions/[decisionId]/withdraw`
- Sets `status='CLOSED'` and `result='WITHDRAWN'`
- Only available while decision is OPEN
- Requires confirmation dialog
- Logs withdrawal event with actor information

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
