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
- **CRITICAL**: NEVER use hardcoded Tailwind color classes (`bg-gray-50`, `text-blue-600`, etc.) - Always use MUI theme colors
- Prefer MUI theme colors over hardcoded values
- For custom components, use Tailwind with theme colors
- Typography: Use MUI Typography component with proper variants
- Buttons: Primary (contained), Secondary (outlined), Accent (for important actions)
- Cards: 12px border-radius, 2px solid border, subtle shadow
- Spacing: Consistent use of MUI spacing units (multiples of 8px)

**Dark Mode Compatibility - Migration Pattern:**

All major pages have been migrated from hardcoded Tailwind colors to MUI theme-aware components. When working on existing or new pages, follow this pattern:

**❌ OLD (Hardcoded - DO NOT USE):**
```typescript
<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
  <h2 className="text-xl font-semibold text-gray-900 mb-2">Title</h2>
  <p className="text-sm text-gray-600">Description</p>
  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded">Badge</div>
</div>
```

**✅ NEW (Theme-aware - ALWAYS USE):**
```typescript
<Box sx={{ backgroundColor: 'background.secondary', border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
  <Typography variant="h5" fontWeight="semibold" sx={{ mb: 1 }}>Title</Typography>
  <Typography variant="body2" color="text.secondary">Description</Typography>
  <Chip label="Badge" size="small" color="primary" />
</Box>
```

**Common Migration Mappings:**
- `bg-gray-50` / `bg-gray-100` → `backgroundColor: 'background.secondary'`
- `text-gray-600` / `text-gray-700` → `color="text.secondary"` or default Typography
- `text-gray-900` → default Typography color or `color="text.primary"`
- `border border-gray-200` → `border: 1, borderColor: 'divider'`
- `bg-blue-50 text-blue-800` → `<Chip color="primary" />` or `<Alert severity="info" />`
- `bg-green-50 text-green-800` → `<Chip color="success" />` or `backgroundColor: 'success.light'`
- `bg-red-50 text-red-800` → `<Chip color="error" />` or `backgroundColor: 'error.light'`
- `bg-orange-50 text-orange-800` → `<Chip color="warning" />` or `backgroundColor: 'warning.light'`
- `bg-yellow-50 text-yellow-800` → `<Alert severity="warning" />`
- `hover:bg-gray-50` → `'&:hover': { backgroundColor: 'action.hover' }`

**Fully Migrated Pages (100% Dark Mode Compatible):**
- ✅ `/organizations/[slug]/decisions/new` - Decision creation form
- ✅ `/organizations/[slug]` - Organization dashboard and decision list
- ✅ `/organizations/[slug]/decisions/[decisionId]/vote` - Voting interface (all decision types)
- ✅ `/organizations/[slug]/decisions/[decisionId]/admin` - Decision administration
- ✅ `/organizations/[slug]/decisions/[decisionId]/results` - Results display (all decision types)

**Key Components Used:**
- `Box` - Container with sx prop for theme-aware styling
- `Typography` - Text with variants (h1-h6, body1-2, caption) and color prop
- `Chip` - Badges with color variants (primary, success, error, warning, default)
- `Alert` - Notifications with severity (info, success, error, warning)
- `Button` - Actions with variants (contained, outlined, text) and color prop
- `LinearProgress` - Progress bars with color variants
- All use `sx` prop or `color` prop for theme integration

**Responsive Design Improvements:**
- Mobile breakpoint harmonized to 900px across all pages (sm: 640px → md: 900px)
- Compact card design for decisions with optimized spacing
- Sidebar adapts height dynamically to viewport
- Filter system with responsive layout (stacked on mobile, inline on desktop)
- Navigation buttons use flexWrap for mobile adaptation

### React Context Provider Architecture

**Provider Nesting Order** (in `app/layout.tsx`):
```typescript
<DarkModeProvider>
  <ThemeProvider>
    <SessionProvider>
      <SidebarRefreshProvider>
        {children}
      </SidebarRefreshProvider>
    </SessionProvider>
  </ThemeProvider>
</DarkModeProvider>
```

**Important Providers:**
- `DarkModeProvider` (`components/providers/DarkModeProvider.tsx`) - Must wrap ThemeProvider to provide dark mode state
- `ThemeProvider` (`components/providers/ThemeProvider.tsx`) - Material-UI theme that depends on dark mode context
- `SessionProvider` (NextAuth) - Authentication session
- `SidebarRefreshProvider` (`components/providers/SidebarRefreshProvider.tsx`) - Counter-based refresh trigger for sidebar updates after votes

**Organization Memory Pattern:**
- `OrganizationMemoryUpdater` component (in `app/organizations/[slug]/layout.tsx`) syncs last visited organization to session JWT
- Uses `useOrganizationMemory()` hook to update `lastOrganizationSlug` in session
- Enables automatic redirect to last visited organization on login

### Next.js 15 Patterns

**Async Params (Breaking Change):**
All dynamic route handlers must await params before destructuring:
```typescript
// Server Components and API Routes
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params  // Must await first!
  // ... use slug
}
```

### Key Directories
```
app/                      # Next.js App Router
├── api/                  # API routes
│   ├── organizations/   # Organization-scoped APIs
│   │   ├── route.ts              # List user's organizations
│   │   └── [slug]/
│   │       ├── route.ts          # Get/update organization
│   │       └── decisions/
│   │           ├── route.ts                    # Create decision
│   │           ├── sidebar/                    # Sidebar decision list
│   │           ├── check-public-slug/          # Check slug availability
│   │           └── [decisionId]/
│   │               ├── route.ts                # Delete decision (drafts only)
│   │               ├── stats/                  # Vote statistics
│   │               ├── close/                  # Close decision
│   │               ├── withdraw/               # Withdraw decision
│   │               ├── history/                # Decision audit trail
│   │               ├── conclusion/             # Add/update conclusion
│   │               ├── opinions/               # ADVICE_SOLICITATION opinions
│   │               └── validate/               # Validate ADVICE_SOLICITATION
│   ├── invitations/     # Invitation acceptance
│   ├── profile/         # User profile API
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
├── decision-logger.ts   # Audit trail logging service
├── email.ts             # Email sending with Resend (+ console fallback)
├── organization.ts      # Permission checking utilities
├── slug.ts              # Slug generation utilities
└── prisma.ts            # Prisma client instance

components/               # React components
├── auth/                # Authentication forms
├── dashboard/           # Dashboard components
│   ├── Dashboard.tsx
│   ├── Sidebar.tsx
│   ├── DashboardContent.tsx
│   ├── DecisionFilters.tsx
│   └── DraftCard.tsx
└── providers/           # Context providers
    ├── DarkModeProvider.tsx
    ├── ThemeProvider.tsx
    ├── SessionProvider.tsx (NextAuth)
    └── SidebarRefreshProvider.tsx

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
- `/organizations/[slug]/decisions/[decisionId]/admin` - Manage decision (creator only)
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
- `PATCH /api/organizations/[slug]/decisions/[decisionId]/withdraw` - Withdraw decision (ADVICE_SOLICITATION, creator only)

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

**CONSENT-Specific Participation Tracking** (see detailed section above):
- Sidebar queries additional fields for CONSENT decisions: `clarificationQuestions`, `opinionResponses`, `consentObjections`
- Custom `hasVoted` logic based on `consentCurrentStage`:
  - CLARIFICATIONS: User posted ≥1 question
  - CLARIFAVIS: User posted question OR submitted opinion
  - AVIS: User submitted opinion
  - OBJECTIONS: User recorded position
- Icons adapt to show participation state per stage, not just final vote

### Organization Dashboard & Filters

**Dashboard Page** (`/organizations/[slug]`):
- Server-side rendering with initial 20 decisions loaded
- Client-side pagination ("Charger 20 décisions de plus" button)
- Real-time filter updates without page reload
- Stage-specific participation tracking for CONSENT decisions (same logic as sidebar)

**Filter System** (`components/dashboard/DecisionFilters.tsx`):
- **Controlled component pattern**: Filter state managed by parent (`DashboardContent`)
- Three filter types:
  1. **Statut** (multi-select): DRAFT, OPEN, CLOSED
  2. **Périmètre** (single select): All organization, specific team, or user's decisions
  3. **Type** (multi-select): ADVICE_SOLICITATION, CONSENSUS, CONSENT, MAJORITY, NUANCED_VOTE
- **State synchronization**:
  - Initial values from URL params (`?status=OPEN`)
  - URL params used for initialization only (not continuously synced)
  - User changes update state immediately via `onFilterChange` callback
  - No automatic URL updates (prevents filter reset issues)
- Responsive layout: stacked on mobile (< 900px), inline on desktop

**CONSENT Stage Chips**:
- Displayed on dashboard for CONSENT decisions with `status=OPEN`
- Shows current stage: Questions, Questions & Avis, Avis, Amendements, Objections
- Color: info (blue), outlined variant
- Located between team chip and result chip

**Key files**:
- `app/organizations/[slug]/page.tsx` - Server component loading initial data
- `components/dashboard/DashboardContent.tsx` - Client component with filters and participation logic
- `components/dashboard/DecisionFilters.tsx` - Controlled filter component
- `app/api/organizations/[slug]/decisions/route.ts` - API with pagination and filtering

## Critical Architecture Details

### Vote Storage Models (3 Parallel Systems)

The application uses **three different vote storage models** depending on decision type:

1. **`Vote` table** - Used for most decision types (CONSENSUS, CONSENT, WEIGHTED_VOTE, etc.)
   - Stores a single `value` field (VoteValue enum)
   - Links to either `userId` (authenticated) or `externalParticipantId` (guest voting)
   - One vote per user per decision

2. **`ProposalVote` table** - Used for MAJORITY decisions with multiple proposals
   - Links to specific `Proposal` record
   - User can only vote for ONE proposal per decision
   - Links to either `userId` or `externalParticipantId`

3. **`NuancedVote` table** - Used for NUANCED_VOTE (Jugement Majoritaire)
   - One vote **per user per proposal** (evaluates each proposal separately)
   - Stores `mention` field (scale: 3, 5, or 7 levels)
   - Results calculated using median mention algorithm

**Important:** When writing vote submission logic, check `decisionType` to determine which table to use.

### Permission Checking Utilities

The `lib/organization.ts` file provides three permission checking functions:

```typescript
// Check if user is a member (any role)
await checkUserIsMember(organizationId, userId)
// Throws 403 if not a member

// Check if user is OWNER or ADMIN
await checkUserPermission(organizationId, userId)
// Throws 403 if only MEMBER role

// Check if user is OWNER
await checkUserIsOwner(organizationId, userId)
// Throws 403 if not OWNER
```

**Usage pattern:**
```typescript
// In API routes
import { checkUserPermission } from "@/lib/organization"

const session = await auth()
await checkUserPermission(organization.id, session.user.id)
// If we reach here, user has permission
```

### Slug Generation Utilities

The `lib/slug.ts` file provides slug generation for organizations and decisions:

```typescript
import { generateSlug, generateAlternativeSlug } from "@/lib/slug"

// Generate slug from text
const slug = generateSlug("Mon Organisation")  // → "mon-organisation"

// Generate alternative if collision detected
const alt = generateAlternativeSlug("mon-organisation", 1)  // → "mon-organisation-1"
```

**Rules:**
- Removes accents (é → e, à → a)
- Converts to lowercase
- Replaces spaces/special chars with hyphens
- Limits to 50 characters
- Used for both organization slugs and decision publicSlugs

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

**CONSENT**: Multi-stage decision-making process based on the sociocratic consent method
- **Five sequential stages**: CLARIFICATIONS, CLARIFAVIS (merged mode) or AVIS, AMENDEMENTS, OBJECTIONS, TERMINEE
- **Two modes**: DISTINCT (5 separate stages) or MERGED (questions+opinions combined into CLARIFAVIS)
- **Stage-specific participation tracking**: Each stage has unique contribution requirements (questions, opinions, positions)
- **Auto-closure**: Decision closes automatically when all participants consent (NO_OBJECTION or NO_POSITION, no real objections)
- **Objection system**:
  - Three position types: NO_OBJECTION (green), NO_POSITION (yellow/warning), OBJECTION (red/error)
  - Valid objections must be: (1) argued, precise, concrete, based on known data AND (2) demonstrate impossibility OR harm to group/purpose
  - Participants can modify their position during OBJECTIONS stage
- **Creator powers**: Can amend, keep, or withdraw proposal during AMENDEMENTS stage
- **Comprehensive UI**: Accordion-based interface showing all stages with progress indicators and locked/unlocked icons
- **Stage chips**: Current stage displayed on organization dashboard (Questions, Avis, Amendements, Objections)
- **Results**: "100% de consentement" if all NO_OBJECTION, otherwise "La décision a été prise par consentement"
- See detailed CONSENT workflow documentation below

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

**Coverage Gaps (see DECISIONLOG_ANALYSIS.md for details):**
- Manual decision launch (INVITED mode) - LAUNCHED event not logged
- Manual decision close - CLOSED event not fully logged in all cases
- External participant votes/comments - not logged to DecisionLog
- Anonymous votes (PUBLIC_LINK) - not logged to DecisionLog
- Participant add/remove events - not logged
- Context updates - logging function exists but never called
- **Current coverage: ~50% of defined event types (11/22)**

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

### CONSENT Decision Workflow (Detailed)

CONSENT decisions follow a multi-stage sociocratic process implemented with accordion-based UI and stage-specific participation tracking.

#### Stage Flow & Timing

**Two modes available:**
1. **DISTINCT**: 5 separate stages (CLARIFICATIONS → AVIS → AMENDEMENTS → OBJECTIONS → TERMINEE)
2. **MERGED**: 4 stages (CLARIFAVIS [questions+opinions combined] → AMENDEMENTS → OBJECTIONS → TERMINEE)

**Timing calculation** (`lib/consent-logic.ts`):
- Total duration split across active stages (20% each stage in MERGED, proportional in DISTINCT)
- Each stage has `startDate` and `endDate` calculated from decision `startDate` and `endDate`
- Current stage determined by comparing `new Date()` with stage timings

#### Stage 1: CLARIFICATIONS (Questions de clarification)

**Purpose**: Participants ask clarifying questions to better understand the proposal

**Participation**:
- Any participant (including creator) can post questions
- Only creator can answer questions
- Questions and answers displayed in chronological order
- **Participation tracked**: User has "participé" if they posted ≥1 question

**UI Elements**:
- Question input field (multiline, 4 rows)
- Submit button "Envoyer la question"
- List of questions with creator's answers
- "Répondre" button for creator on unanswered questions

**API**: `POST /api/organizations/[slug]/decisions/[decisionId]/clarifications`

#### Stage 2: AVIS (Partage d'avis) / CLARIFAVIS (Combined)

**Purpose**: Participants share their opinions on the proposal

**Participation**:
- Each participant submits one opinion (can update before stage ends)
- Opinions visible to all participants
- **CLARIFAVIS mode**: Questions and opinions collected simultaneously
- **Participation tracked**:
  - AVIS: User has "participé" if they submitted opinion
  - CLARIFAVIS: User has "participé" if they posted question OR submitted opinion

**UI Elements**:
- Opinion textarea (multiline, 6 rows)
- Submit button "Enregistrer mon avis" (or "Modifier mon avis" if existing)
- List of all opinions with participant names and timestamps

**API**: `POST /api/organizations/[slug]/decisions/[decisionId]/opinions`

#### Stage 3: AMENDEMENTS (Amendements)

**Purpose**: Creator reviews feedback and decides whether to amend, keep, or withdraw proposal

**Creator-only stage** - participants wait

**Creator actions** (mutually exclusive):
1. **Amend proposal**: Edit proposal text → `consentAmendmentAction = 'AMENDED'`
2. **Keep proposal**: Proceed unchanged → `consentAmendmentAction = 'KEPT'`
3. **Withdraw proposal**: Cancel decision → `status = 'CLOSED'`, `result = 'WITHDRAWN'`

**UI Elements**:
- Textarea pre-filled with current proposal
- Three action buttons: "Amender la proposition", "Garder la proposition initiale", "Retirer la proposition"
- Confirmation dialogs for keep/withdraw actions
- **After stage ends**: Display shows what creator did with timestamp and proposal text

**APIs**:
- `PATCH /api/organizations/[slug]/decisions/[decisionId]/consent-amend`
- `PATCH /api/organizations/[slug]/decisions/[decisionId]/consent-keep`
- `PATCH /api/organizations/[slug]/decisions/[decisionId]/consent-withdraw`

**History tracking**:
- KEPT: "JJ/MM/AAAA HH:MM - [Creator name] a gardé sa proposition initiale que voici : [initial proposal]"
- AMENDED: "JJ/MM/AAAA HH:MM - [Creator name] a amendé sa proposition initiale comme suit : [new proposal]"
- WITHDRAWN: "JJ/MM/AAAA HH:MM - [Creator name] a retiré sa proposition."

#### Stage 4: OBJECTIONS (Objections)

**Purpose**: Participants express their final position on the proposal

**Participation**:
- Three position options:
  1. **NO_OBJECTION** (green button): "Pas d'objection" - Full consent
  2. **NO_POSITION** (yellow/warning button): "Je ne me prononce pas" - Abstention
  3. **OBJECTION** (red/error button): "J'ai une objection" - Requires explanation text
- **Modification allowed**: Participants can change their position at any time during this stage
- **Participation tracked**: User has "participé" if they recorded a position

**Valid objection criteria** (displayed in warning Alert):
1. Argued, precise, concrete, based on known data
2. Demonstrates proposal is impossible to realize OR will harm group/purpose

**UI Elements**:
- Warning Alert explaining valid objection criteria
- Three colored buttons for position selection
- Textarea for objection text (required if OBJECTION selected)
- "Enregistrer ma position" button (or "Enregistrer les modifications" in edit mode)
- **After voting**: Display position with "Modifier" button
- **Positions list**: Shows all participants' positions:
  - "[Name] ne se prononce pas" (NO_POSITION)
  - "[Name] - pas d'objection" (NO_OBJECTION)
  - "[Name] a émis l'objection suivante : [text]" (OBJECTION with indented text)

**Edit mode**:
- Click "Modifier" button → Form reappears with current values pre-filled
- Can change position type and objection text
- "Annuler" button to exit edit mode without saving

**Auto-closure logic** (`consent-objections/route.ts`):
```typescript
// After each position submission:
if (allObjections.length === allParticipants) {
  const hasRealObjection = allObjections.some(obj => obj.status === 'OBJECTION');
  if (!hasRealObjection) {
    // Close automatically: status=CLOSED, consentCurrentStage=TERMINEE, result=APPROVED
  }
}
```

**API**: `POST /api/organizations/[slug]/decisions/[decisionId]/consent-objections`

#### Stage 5: TERMINEE (Décision finalisée)

**Purpose**: Display final decision outcome

**Possible outcomes**:
1. **APPROVED** (consent reached):
   - If all positions are NO_OBJECTION: "JJ/MM/AAAA HH:MM - La décision a été prise par consentement. **100% de consentement**"
   - If some NO_POSITION: "JJ/MM/AAAA HH:MM - La décision a été prise par consentement"
2. **BLOCKED** (real objection): "Décision bloquée par une objection"
3. **WITHDRAWN**: "Proposition retirée"

**UI**: Success/Error/Info Alert with appropriate message and icon

#### Stage-Specific Participation Tracking

**Sidebar & Dashboard** (`/api/organizations/[slug]/decisions/sidebar`, `DashboardContent.tsx`):
- **CLARIFICATIONS**: `hasVoted = clarificationQuestions.length > 0`
- **CLARIFAVIS**: `hasVoted = clarificationQuestions.length > 0 || opinionResponses.length > 0`
- **AVIS**: `hasVoted = opinionResponses.length > 0`
- **OBJECTIONS**: `hasVoted = consentObjections.length > 0`
- **Other stages**: Use default `DecisionParticipant.hasVoted` field

**Visual indicators**:
- Sidebar: AccessTime (clock) = action required, ThumbUp = participated, Visibility = not participant
- Dashboard chips: "Action requise" (warning/orange) vs "✓ Participé" (success/green)
- Dashboard stage chip: Shows current stage name (Questions, Questions & Avis, Avis, Amendements, Objections) in blue/info color

#### Data Model

**CONSENT-specific fields on Decision:**
```typescript
consentStepMode: 'DISTINCT' | 'MERGED'
consentCurrentStage: 'CLARIFICATIONS' | 'CLARIFAVIS' | 'AVIS' | 'AMENDEMENTS' | 'OBJECTIONS' | 'TERMINEE'
consentAmendmentAction: 'KEPT' | 'AMENDED' | 'WITHDRAWN' | null
```

**Related tables:**
- `ClarificationQuestion`: Questions with creator answers
- `OpinionResponse`: Participant opinions
- `ConsentObjection`: Participant positions (NO_OBJECTION, NO_POSITION, OBJECTION)

#### Key Files

**Frontend (Accordion UI):**
- `app/organizations/[slug]/decisions/[decisionId]/vote/ConsentAccordionStages.tsx` - Main accordion component
- `app/organizations/[slug]/decisions/[decisionId]/vote/ConsentVoteClient.tsx` - Parent with state management
- `lib/consent-logic.ts` - Stage timing calculations

**Backend (APIs):**
- `app/api/organizations/[slug]/decisions/[decisionId]/clarifications/route.ts` - Questions
- `app/api/organizations/[slug]/decisions/[decisionId]/opinions/route.ts` - Opinions
- `app/api/organizations/[slug]/decisions/[decisionId]/consent-amend/route.ts` - Amend proposal
- `app/api/organizations/[slug]/decisions/[decisionId]/consent-keep/route.ts` - Keep proposal
- `app/api/organizations/[slug]/decisions/[decisionId]/consent-withdraw/route.ts` - Withdraw proposal
- `app/api/organizations/[slug]/decisions/[decisionId]/consent-objections/route.ts` - Positions + auto-close

**Participation tracking:**
- `app/api/organizations/[slug]/decisions/sidebar/route.ts` - Sidebar with stage-specific hasVoted
- `components/dashboard/DashboardContent.tsx` - Dashboard with stage-specific participation logic
- `app/organizations/[slug]/page.tsx` - Server-side initial data load

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
   - **Display behavior for PUBLIC_LINK mode**:
     - Vote count shows only "X votes" (without participant count, as there are no DecisionParticipant records)
     - Applied to all decision types: CONSENSUS, MAJORITY, NUANCED_VOTE
   - **Display behavior for WITHDRAWN decisions**:
     - For CONSENSUS, MAJORITY, and NUANCED_VOTE types: Shows only status card with "Proposition retirée" chip and finalization date
     - No winner or vote results are displayed for withdrawn decisions
     - Consistent with ADVICE_SOLICITATION withdrawn display pattern

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

### Decision Creation Flow (Consolidated on `/new`)

**IMPORTANT CHANGE**: The entire decision creation and configuration process now happens on the `/new` page in a single consolidated form. The decision is created AND launched with participants in one action.

**New Flow:**
1. User fills out the complete decision form on `/organizations/[slug]/decisions/new`
2. Form includes ALL configuration in one page:
   - Basic info (title, description, decision type, voting mode)
   - Mode-specific fields:
     - **CONSENSUS**: `initialProposal` (copied to both `initialProposal` and `proposal` fields)
     - **ADVICE_SOLICITATION**: `initialProposal` (intention de décision)
     - **MAJORITY**: Multiple proposals (title + description each)
     - **NUANCED_VOTE**: Multiple proposals + scale selection (3/5/7 levels)
   - Deadline field (required for all except ADVICE_SOLICITATION, hidden for ADVICE_SOLICITATION)
   - **Participants section** (only for INVITED mode, hidden for PUBLIC_LINK):
     - **Two tabs**: "Équipes et membres" and "Invitations externes"
     - **Équipes et membres tab**:
       - Hierarchical view with collapsible teams (chevron icons)
       - Each team shows checkbox (supports indeterminate state) + expand/collapse button
       - Team members visible when expanded, indented with individual checkboxes
       - "Sans équipe" section at bottom for members not in any team
       - Selecting a team selects all its members; deselecting removes all
       - Members can appear in multiple teams; selecting them in one reflects in all
       - **For ADVICE_SOLICITATION**: Current user (decision creator) is filtered out and cannot be selected
       - **For other types (CONSENSUS, MAJORITY, NUANCED_VOTE)**: Current user appears in list and is pre-selected by default (can be unchecked)
       - Max height 600px with scroll for long lists
       - Compact design with hover effects
     - **Invitations externes tab**:
       - Email (60%) and Name (40%) fields side-by-side in wide mode, stacked on mobile
       - Email validation with regex before adding to list
       - Single card displaying all added external participants
       - Consistent text-sm font size throughout
     - **Summary**: Shows "X membres internes et Y invités externes participent à la décision" (or "sont sollicités pour leur avis" for ADVICE_SOLICITATION)
     - Validation of ADVICE_SOLICITATION constraints (minimum participants based on org size)
3. User clicks "Lancer la décision" (not "Créer et configurer" anymore)
4. API creates decision with `status='OPEN'` + creates all participants + sends emails to external participants
5. Redirection after launch:
   - **PUBLIC_LINK mode** → `/organizations/[slug]/decisions/[id]/share` (QR code + link)
   - **INVITED mode** (creator is participant) → `/organizations/[slug]/decisions/[id]/vote`
   - **INVITED mode** (creator not participant) → `/organizations/[slug]/decisions/[id]/admin`

**Draft System (Manual Save Only):**
- **No auto-save**: Removed to simplify the flow
- **Manual save button**: "Enregistrer en brouillon" button only
- **Drafts do NOT include participants**: Too complex to persist, users must reconfigure participants when resuming
- Visual feedback: "Sauvegardé à [time]" after manual save
- Drafts accessible from dashboard → "Continuer" reopens `/new` with pre-filled data (except participants)

**API Endpoint Changes:**
- `GET /api/organizations/[slug]/members` now includes team memberships:
  - Returns `members` with `teamMembers` relation populated
  - Each member includes `teamMembers: Array<{ team: { id, name } }>`
  - Used by `/new` page to build hierarchical team/member selection UI
- `POST /api/organizations/[slug]/decisions` now accepts:
  - `launch: boolean` flag (default: false)
  - `teamIds: string[]` (team IDs to invite)
  - `userIds: string[]` (user IDs to invite)
  - `externalParticipants: Array<{email: string, name: string}>` (external participants)
- When `launch: true`:
  - Sets `status='OPEN'` and `startDate=now()`
  - Creates all `DecisionParticipant` records
  - Generates tokens for external participants
  - Sends emails to external participants
  - Logs 'LAUNCHED' event
- When `launch: false` (draft):
  - Sets `status='DRAFT'`
  - Does NOT create participants
  - Does NOT send emails

**Page `/admin` Role (Post-Launch Management Only):**
The `/admin` page is now **only for post-launch management**, NOT for initial configuration:

- **All modes** (except PUBLIC_LINK which redirects to `/share`):
  - View participants list with vote/opinion status
  - Button "Retirer la décision" (only if status='OPEN', sets status=CLOSED + result=WITHDRAWN via `/withdraw` API)
  - Button "Voir la décision en cours" or "Voir le vote" (redirects to `/vote` page)

- **CONSENSUS specific**:
  - View initial proposal (immutable)
  - Edit amended proposal (only while OPEN)
  - Add conclusion (when voting finished)

- **MAJORITY & NUANCED_VOTE specific**:
  - Add conclusion (when voting finished)

- **ADVICE_SOLICITATION specific**:
  - Edit intention (only if no opinions yet, disabled after first opinion)
  - View opinion status (how many opinions received)
  - Add final decision (when all opinions received)
  - Button "Valider la décision finale" (when all opinions received, sets status=CLOSED + result=APPROVED via `/validate` API)

**Important Notes:**
- Creator is automatically added as participant in INVITED mode
- `/admin` page is NOT accessible for PUBLIC_LINK decisions (redirects to `/share`)
- Participant management completely removed from `/admin` (now only in `/new`)
- "Lancer la décision" button replaces old "Créer et configurer" workflow

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

**Email System (`lib/email.ts`):**
- Uses Resend API when `RESEND_API_KEY` is configured
- **Fallback pattern**: If API key is missing or request fails, email content is logged to console
- Converts HTML emails to plain text for better compatibility
- Three email templates: Generic, Invitation, Welcome

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

**Transactions for Atomic Operations:**
Use Prisma transactions when multiple related writes must succeed together:
```typescript
await prisma.$transaction([
  prisma.vote.create({ data: voteData }),
  prisma.anonymousVoteLog.create({ data: logData })
])
```
Currently used in: PUBLIC_LINK vote submission to ensure vote + IP log are created atomically.

### Component Architecture Pattern

**Server Components vs Client Components:**
- **Page files** (`page.tsx`) are Server Components by default - handle data fetching and authentication
- **Client Components** handle interactivity - marked with `"use client"` directive
- **Pattern**: Page components fetch data → Pass to Client component for UI

Example:
```
app/organizations/[slug]/decisions/[decisionId]/vote/
├── page.tsx              # Server: Fetches decision data, checks auth
└── VotePageClient.tsx    # Client: Interactive voting form
```

**Common Client Components:**
- `*Client.tsx` - Interactive forms and UI
- `*Form.tsx` - Form components with validation
- Components using hooks (useState, useEffect, useContext)
- Components using browser APIs (localStorage, window)

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

**Fetching decisions with pagination (organization dashboard):**
```typescript
// Server-side pagination with 20 decisions per page
const decisions = await prisma.decision.findMany({
  where: { organizationId: organization.id },
  include: {
    creator: { select: { id: true, name: true, email: true, image: true } },
    team: { select: { id: true, name: true } },
    participants: {
      select: {
        userId: true,
        hasVoted: true,
        teamId: true,  // IMPORTANT: Load teamId for team filtering
      },
    },
    _count: { select: { votes: true, comments: true, participants: true } },
  },
  orderBy: { createdAt: 'desc' },
  skip: 0,  // Incremented by 20 for "Load more" button
  take: 20,
})

const totalCount = await prisma.decision.count({
  where: { organizationId: organization.id },
})
```

**Team filtering logic:**
When filtering decisions by team, check BOTH:
1. `decision.teamId` (decision dedicated to a specific team)
2. `decision.participants.some(p => p.teamId === teamId)` (participants invited via team)

This is necessary because when inviting an entire team to a decision, the decision itself doesn't have a `teamId`, but each participant has `teamId` set in their `DecisionParticipant` record.

## Key Files for Understanding Architecture

When onboarding to this codebase or debugging complex issues, read these files in order:

**Core Architecture (Read First):**
1. `prisma/schema.prisma` - Complete data model and relationships
2. `types/enums.ts` - All type definitions and validation helpers
3. `lib/auth.ts` - NextAuth configuration and session management
4. `app/layout.tsx` - Provider nesting order and global layout

**Business Logic (Critical):**
5. `lib/decision-logic.ts` - Decision result calculation for all 8 decision types
6. `lib/decision-logger.ts` - Audit trail logging service (see coverage gaps)
7. `lib/organization.ts` - Permission checking utilities
8. `lib/slug.ts` - Slug generation for organizations and decisions
9. `lib/email.ts` - Email system with Resend fallback

**API Patterns (Examples):**
10. `app/api/organizations/[slug]/decisions/route.ts` - Decision creation and pagination (GET supports ?skip=0&take=20)
11. `app/api/organizations/[slug]/decisions/[decisionId]/vote/route.ts` - Authenticated vote submission for all decision types
12. `app/api/public-vote/[orgSlug]/[publicSlug]/route.ts` - Anonymous voting with IP hashing and transactions
13. `app/api/vote/[token]/route.ts` - External participant token-based voting (guest access)

**UI Patterns (Examples):**
14. `components/providers/` - All context providers (DarkMode, Theme, Session, SidebarRefresh)
15. `app/organizations/[slug]/decisions/new/page.tsx` - Draft auto-save pattern
16. `app/organizations/[slug]/decisions/[decisionId]/vote/VotePageClient.tsx` - Vote form with sidebar refresh

**Documentation:**
17. `DECISIONLOG_ANALYSIS.md` - Audit trail coverage analysis and gaps
18. `ORGANIZATIONS_FEATURES.md` - Organization management details
19. `MIGRATE_HISTORY.md` - Recent feature additions

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
