# DecisionLog Comprehensive Analysis Report

## Executive Summary

The DecisionLog system in Decidoo is partially implemented. While core logging exists for certain events, there are significant gaps in:
1. Manual decision lifecycle events (launch, close)
2. Participant management events (add, remove)
3. External/anonymous voting events (via tokens and public links)
4. Proposal management events
5. Decision reopening

---

## Part 1: All DecisionLog Creation Points

### 1.1 Decision Creation (`POST /api/organizations/[slug]/decisions`)
**File**: `/home/user/decido/app/api/organizations/[slug]/decisions/route.ts`

```typescript
// Line 348: Log decision creation
await logDecisionCreated(decision.id, session.user.id);

// Lines 351-360: For PUBLIC_LINK mode, also log automatic launch
if (votingMode === 'PUBLIC_LINK') {
  await prisma.decisionLog.create({
    data: {
      decisionId: decision.id,
      eventType: 'LAUNCHED',
      actorId: session.user.id,
      oldValue: 'DRAFT',
      newValue: 'OPEN',
    },
  });
}
```

**Events Logged**: 
- ✓ `CREATED` (all decisions)
- ✓ `LAUNCHED` (only for PUBLIC_LINK mode, automatic at creation)

**Issue**: PUBLIC_LINK decisions auto-launch during creation, but INVITED mode decisions require manual launch (which is not logged).

---

### 1.2 Decision Update (`PATCH /api/organizations/[slug]/decisions/[decisionId]`)
**File**: `/home/user/decido/app/api/organizations/[slug]/decisions/[decisionId]/route.ts`

```typescript
// Lines 304-318: Log modifications
if (body.title !== undefined && body.title !== decision.title) {
  await logDecisionTitleUpdated(decisionId, session.user.id, decision.title, body.title);
}
if (body.description !== undefined && body.description !== decision.description) {
  await logDecisionDescriptionUpdated(decisionId, session.user.id, decision.description, body.description);
}
if (body.endDate !== undefined) {
  const newEndDate = new Date(body.endDate);
  const oldEndDate = decision.endDate;
  if (oldEndDate?.getTime() !== newEndDate.getTime()) {
    await logDecisionDeadlineUpdated(decisionId, session.user.id, oldEndDate, newEndDate);
  }
}
if (body.proposal !== undefined && body.proposal !== decision.proposal) {
  await logProposalAmended(decisionId, session.user.id);
}
```

**Events Logged**:
- ✓ `TITLE_UPDATED` (only if changed)
- ✓ `DESCRIPTION_UPDATED` (only if changed)
- ✓ `DEADLINE_UPDATED` (only if changed)
- ✓ `PROPOSAL_AMENDED` (only for CONSENSUS, only if changed)

**Issues**:
- Context is not logged when modified
- Can only modify certain fields during OPEN/CLOSED state
- No logging for other field updates (votingMode, teamId, etc.)

---

### 1.3 Decision Launch (INVITED mode)
**File**: `/home/user/decido/app/api/organizations/[slug]/decisions/[decisionId]/launch/route.ts`

```typescript
// Lines 106-114: Update decision
const updated = await prisma.decision.update({
  where: { id: decisionId },
  data: {
    status: 'OPEN',
    startDate: new Date(),
    publicToken,
  },
});
```

**Events Logged**: ❌ NONE

**Issue**: Manual decision launch for INVITED mode does not log any event. This is a critical gap.

**Should Log**: 
- `LAUNCHED` event with actor information

---

### 1.4 Decision Close (Manual)
**File**: `/home/user/decido/app/api/organizations/[slug]/decisions/[decisionId]/close/route.ts`

```typescript
// Lines 63-69: Close decision
const updatedDecision = await prisma.decision.update({
  where: { id: decisionId },
  data: {
    status: 'CLOSED',
    decidedAt: new Date(),
  },
});
```

**Events Logged**: ❌ NONE

**Issue**: Manual decision closure does not log any event.

**Should Log**:
- `CLOSED` event with reason = 'manual'

---

### 1.5 Decision Close (Automatic via Results Page)
**File**: `/home/user/decido/app/organizations/[slug]/decisions/[decisionId]/results/page.tsx`

```typescript
// Lines 156-166: Auto-close when voting finished
if (decision.status === 'OPEN' && isVotingFinished) {
  await prisma.decision.update({
    where: { id: decision.id },
    data: { status: 'CLOSED' },
  });
  decision.status = 'CLOSED';

  const reason = isDeadlinePassed ? 'deadline_reached' : 'all_voted';
  await logDecisionClosed(decision.id, session.user.id, reason);
}
```

**Events Logged**:
- ✓ `CLOSED` with metadata containing reason ('deadline_reached' or 'all_voted')

**Note**: Only logged when user accesses results page after voting finishes.

---

### 1.6 Voting - Authenticated (INVITED mode)
**File**: `/home/user/decido/app/api/organizations/[slug]/decisions/[decisionId]/vote/route.ts`

#### CONSENSUS Voting
```typescript
// Lines 192-211: Log consensus votes with details
const userName = session.user.name || session.user.email || 'Utilisateur';
if (existingVote) {
  await logVoteUpdated(
    decisionId,
    session.user.id,
    userName,
    undefined,
    existingVote.value,
    value
  );
} else {
  await logVoteRecorded(
    decisionId,
    session.user.id,
    userName,
    undefined,
    value
  );
}
```

**Events Logged**:
- ✓ `VOTE_RECORDED` (new votes, with vote value in metadata)
- ✓ `VOTE_UPDATED` (modified votes, with old/new values)

**Metadata**: voteValue in CONSENSUS, old/new vote values on update

#### MAJORITY Voting
```typescript
// Lines 132-137: Log majority votes anonymously
if (existingVote) {
  await logVoteUpdated(decisionId);
} else {
  await logVoteRecorded(decisionId);
}
```

**Events Logged**:
- ✓ `VOTE_RECORDED` (new votes, anonymous)
- ✓ `VOTE_UPDATED` (modified votes, anonymous)

**Note**: No actor information is logged for privacy

#### NUANCED_VOTE Voting
```typescript
// Lines 338-342: Log nuanced votes
if (hadVoted) {
  await logVoteUpdated(decisionId);
} else {
  await logVoteRecorded(decisionId);
}
```

**Events Logged**:
- ✓ `VOTE_RECORDED` (new votes, anonymous)
- ✓ `VOTE_UPDATED` (modified votes, anonymous)

**Note**: No actor information is logged for privacy

---

### 1.7 Voting - External Participants (Token-based)
**File**: `/home/user/decido/app/api/vote/[token]/route.ts`

```typescript
// Lines 209-223 (MAJORITY): Vote recorded but NOT logged
const vote = await prisma.proposalVote.create({...});
await prisma.decisionParticipant.update({...data: { hasVoted: true }...});
// NO LOGGING CALL

// Lines 242-269 (CONSENSUS): Vote recorded but NOT logged
vote = await prisma.vote.create({...});
// NO LOGGING CALL

// Lines 271-279 (CONSENSUS comments): Comment created but NOT logged
createdComment = await prisma.comment.create({...});
// NO LOGGING CALL
```

**Events Logged**: ❌ NONE

**Critical Issue**: External participant votes and comments are not logged at all. This is a major gap for audit trails.

---

### 1.8 Voting - Anonymous (Public Link mode)
**File**: `/home/user/decido/app/api/public-vote/[orgSlug]/[publicSlug]/route.ts`

```typescript
// CONSENSUS (Lines 200-217):
await prisma.$transaction([
  prisma.vote.create({data: {...}}),
  prisma.anonymousVoteLog.create({...}),
]);
// NO DECISION_LOG CALL

// MAJORITY (Lines 263-279):
await prisma.$transaction([
  prisma.proposalVote.create({...}),
  prisma.anonymousVoteLog.create({...}),
]);
// NO DECISION_LOG CALL

// NUANCED_VOTE (Lines 336-354):
await prisma.$transaction([
  ...nuancedVotes.map(...),
  prisma.anonymousVoteLog.create({...}),
]);
// NO DECISION_LOG CALL
```

**Events Logged**: ❌ NONE

**Critical Issue**: Anonymous votes are not logged. While votes are tracked in AnonymousVoteLog for vote counting, there's no audit trail in DecisionLog.

---

### 1.9 Comments - Authenticated
**File**: `/home/user/decido/app/api/organizations/[slug]/decisions/[decisionId]/comments/route.ts`

```typescript
// Lines 112-114: Log comment creation
const userName = session.user.name || session.user.email || 'Utilisateur';
await logCommentAdded(decisionId, session.user.id, userName);
```

**Events Logged**:
- ✓ `COMMENT_ADDED` (with actor information)

---

### 1.10 Comments - External/Anonymous
**File**: `/home/user/decido/app/api/vote/[token]/route.ts` and `/home/user/decido/app/api/public-vote/[orgSlug]/[publicSlug]/route.ts`

```typescript
// External (Lines 271-279):
createdComment = await prisma.comment.create({...});
// NO LOGGING

// Anonymous (Public link):
// No comment functionality at all
```

**Events Logged**: ❌ NONE

**Issue**: External participant comments are not logged.

---

### 1.11 Participants - Add
**File**: `/home/user/decido/app/api/organizations/[slug]/decisions/[decisionId]/participants/route.ts`

```typescript
// Lines 89-105 (Teams), 129-144 (Users), 162-171 (External):
const participant = await prisma.decisionParticipant.create({...});
// NO LOGGING CALLS
```

**Events Logged**: ❌ NONE

**Issue**: No logging when participants are added, despite `PARTICIPANT_ADDED` event type being defined.

---

### 1.12 Participants - Remove
**File**: `/home/user/decido/app/api/organizations/[slug]/decisions/[decisionId]/participants/route.ts`

```typescript
// Lines 252-256:
await prisma.decisionParticipant.delete({...});
// NO LOGGING CALL
```

**Events Logged**: ❌ NONE

**Issue**: No logging when participants are removed, despite `PARTICIPANT_REMOVED` event type being defined.

---

### 1.13 Conclusion
**File**: `/home/user/decido/app/api/organizations/[slug]/decisions/[decisionId]/conclusion/route.ts`

```typescript
// Lines 74-82: Update conclusion
const updated = await prisma.decision.update({...});
await logConclusionAdded(decisionId, session.user.id);
```

**Events Logged**:
- ✓ `CONCLUSION_ADDED`

---

### 1.14 Proposal Creation
**File**: `/home/user/decido/app/api/organizations/[slug]/decisions/[decisionId]/proposals/route.ts`

```typescript
// Lines 84-91:
const proposal = await prisma.proposal.create({...});
// NO LOGGING CALL
```

**Events Logged**: ❌ NONE

**Issue**: Proposal creation is not logged, despite being an important decision element.

---

## Part 2: Events by Decision Type

### CONSENSUS Decisions

| Event | Logged | Location | Notes |
|-------|--------|----------|-------|
| CREATED | ✓ | Decision creation API | Always |
| LAUNCHED | ✓ (auto only) | Decision creation (PUBLIC_LINK) | Not for INVITED mode |
| TITLE_UPDATED | ✓ | Decision update API | If changed |
| DESCRIPTION_UPDATED | ✓ | Decision update API | If changed |
| CONTEXT_UPDATED | ❌ | - | Never implemented |
| DEADLINE_UPDATED | ✓ | Decision update API | If changed |
| PROPOSAL_AMENDED | ✓ | Decision update & vote API | If changed |
| CONCLUSION_ADDED | ✓ | Conclusion API | When added |
| PARTICIPANT_ADDED | ❌ | - | Not logged |
| PARTICIPANT_REMOVED | ❌ | - | Not logged |
| VOTE_RECORDED | ✓ | Vote API | With vote value |
| VOTE_UPDATED | ✓ | Vote API | With old/new values |
| COMMENT_ADDED | ✓ | Comments API | Authenticated only |
| CLOSED | ✓ | Results page (auto) | Not for manual close |
| REOPENED | ❌ | - | Event type defined but never used |
| STATUS_CHANGED | ❌ | - | Event type defined but never used |

**Coverage**: ~62% (8/13 core events)

---

### MAJORITY Decisions

| Event | Logged | Location | Notes |
|-------|--------|----------|-------|
| CREATED | ✓ | Decision creation API | Always |
| LAUNCHED | ✓ (auto only) | Decision creation (PUBLIC_LINK) | Not for INVITED mode |
| TITLE_UPDATED | ✓ | Decision update API | If changed |
| DESCRIPTION_UPDATED | ✓ | Decision update API | If changed |
| CONTEXT_UPDATED | ❌ | - | Never implemented |
| DEADLINE_UPDATED | ✓ | Decision update API | If changed |
| PROPOSAL_AMENDED | ❌ | - | N/A (CONSENSUS only) |
| CONCLUSION_ADDED | ✓ | Conclusion API | When added |
| PARTICIPANT_ADDED | ❌ | - | Not logged |
| PARTICIPANT_REMOVED | ❌ | - | Not logged |
| VOTE_RECORDED | ✓ | Vote API | Anonymous (no actor details) |
| VOTE_UPDATED | ✓ | Vote API | Anonymous |
| COMMENT_ADDED | ✓ | Comments API | Authenticated only |
| CLOSED | ✓ | Results page (auto) | Not for manual close |
| REOPENED | ❌ | - | Event type defined but never used |
| STATUS_CHANGED | ❌ | - | Event type defined but never used |

**Coverage**: ~61% (8/13 core events)

**Special Note**: External participant votes (via token) are NOT logged in MAJORITY decisions.

---

### NUANCED_VOTE Decisions

| Event | Logged | Location | Notes |
|-------|--------|----------|-------|
| CREATED | ✓ | Decision creation API | Always |
| LAUNCHED | ✓ (auto only) | Decision creation (PUBLIC_LINK) | Not for INVITED mode |
| TITLE_UPDATED | ✓ | Decision update API | If changed |
| DESCRIPTION_UPDATED | ✓ | Decision update API | If changed |
| CONTEXT_UPDATED | ❌ | - | Never implemented |
| DEADLINE_UPDATED | ✓ | Decision update API | If changed |
| PROPOSAL_AMENDED | ❌ | - | N/A (CONSENSUS only) |
| CONCLUSION_ADDED | ✓ | Conclusion API | When added |
| PARTICIPANT_ADDED | ❌ | - | Not logged |
| PARTICIPANT_REMOVED | ❌ | - | Not logged |
| VOTE_RECORDED | ✓ | Vote API | Anonymous (no actor details) |
| VOTE_UPDATED | ✓ | Vote API | Anonymous |
| COMMENT_ADDED | ✓ | Comments API | Authenticated only |
| CLOSED | ✓ | Results page (auto) | Not for manual close |
| REOPENED | ❌ | - | Event type defined but never used |
| STATUS_CHANGED | ❌ | - | Event type defined but never used |

**Coverage**: ~61% (8/13 core events)

---

### Other Decision Types (CONSENT, SUPERMAJORITY, WEIGHTED_VOTE, ADVISORY)

Same logging as CONSENSUS/MAJORITY depending on voting mechanism.

---

## Part 3: Events by Voting Mode

### INVITED Mode

| Event | Logged | Note |
|-------|--------|------|
| Decision Lifecycle | | |
| - Creation | ✓ | Always |
| - Manual Launch | ❌ | **GAP** |
| - Manual Close | ❌ | **GAP** |
| - Auto Close (deadline) | ✓ | Via results page |
| - Auto Close (all voted) | ✓ | Via results page |
| Participants | | |
| - Add | ❌ | **GAP** |
| - Remove | ❌ | **GAP** |
| Internal Member Votes | ✓ | Logged with actor |
| External Participant Votes | ❌ | **GAP** - No logging |
| Comments | | |
| - From Members | ✓ | Logged with actor |
| - From External | ❌ | **GAP** - No logging |
| Metadata | ✓ | Title, description, deadline |

**Critical Gaps**: 4 major categories

---

### PUBLIC_LINK Mode

| Event | Logged | Note |
|-------|--------|------|
| Decision Lifecycle | | |
| - Creation + Auto-Launch | ✓ | Logged as CREATED + LAUNCHED |
| - Manual Close | ❌ | **GAP** |
| - Auto Close (deadline) | ✓ | Via results page |
| Participants | N/A | No participant management |
| Anonymous Votes | ❌ | **GAP** - AnonymousVoteLog exists but not DecisionLog |
| Comments | N/A | Not supported |
| Metadata | ✓ | Title, description, deadline |

**Critical Gaps**: 2 major categories

---

## Part 4: Missing/Incomplete Logging

### Events Defined but Never Logged
1. **STATUS_CHANGED** - Type exists but never used (should be used for manual launch/close)
2. **REOPENED** - Type exists but never used (no reopen functionality implemented)

### Critical Missing Logging
1. **Manual Decision Launch** (INVITED mode)
   - Gap: `/decisions/[decisionId]/launch` route
   - Should log: `LAUNCHED` with status change from DRAFT to OPEN

2. **Manual Decision Close** 
   - Gap: `/decisions/[decisionId]/close` route  
   - Should log: `CLOSED` with reason='manual'

3. **Participant Management**
   - Gap: `/participants` POST and DELETE routes
   - Should log: `PARTICIPANT_ADDED` and `PARTICIPANT_REMOVED` with participant details

4. **External Participant Votes** (Token-based)
   - Gap: `/api/vote/[token]` POST route
   - Should log: `VOTE_RECORDED` / `VOTE_UPDATED` with participant name

5. **External Participant Comments** (Token-based)
   - Gap: `/api/vote/[token]` POST route
   - Should log: `COMMENT_ADDED` with participant name

6. **Anonymous Votes** (Public Link)
   - Gap: `/api/public-vote/[orgSlug]/[publicSlug]` POST route
   - Should log: `VOTE_RECORDED` / `VOTE_UPDATED` (anonymously)
   - Note: AnonymousVoteLog exists for vote counting, but DecisionLog should also track

7. **Proposal Management**
   - Gap: `/proposals` POST and DELETE routes
   - Should log: New event types like `PROPOSAL_CREATED`, `PROPOSAL_DELETED`

8. **Context Updates**
   - Gap: Not implemented in decision-logger.ts despite being in enums
   - `logDecisionContextUpdated()` exists but never called

---

## Part 5: Data Quality Issues

### CONSENSUS Votes
- ✓ Good: Vote values logged (AGREE/DISAGREE) in metadata
- ✓ Good: Old and new values logged on update
- ✓ Good: Actor name logged

### MAJORITY/NUANCED_VOTE
- ⚠ Issue: No actor information logged (intentionally anonymous)
- ✓ Good: Vote count tracking via AnonymousVoteLog for replay detection
- ❌ Gap: No way to distinguish between first vote and update in the log
  - Both VOTE_RECORDED and VOTE_UPDATED called without identifying which

### External Participants
- ❌ Critical: Not logged at all
- ❌ No audit trail for external voting
- ❌ No way to track when external participants voted

### Anonymous Voters
- ⚠ Issue: AnonymousVoteLog only tracks IP hash, not DecisionLog
- ❌ No audit trail in DecisionLog
- ❌ Harder to analyze voting patterns

---

## Part 6: Event Type Definitions

### Defined in `/types/enums.ts`
```typescript
export type DecisionLogEventType =
  // Lifecycle: 4 types
  | 'CREATED'              // ✓ Used
  | 'STATUS_CHANGED'       // ❌ Never used
  | 'CLOSED'               // ✓ Partially used
  | 'REOPENED'             // ❌ Never used
  
  // Modifications: 5 types
  | 'TITLE_UPDATED'        // ✓ Used
  | 'DESCRIPTION_UPDATED'  // ✓ Used
  | 'CONTEXT_UPDATED'      // ❌ Never used
  | 'DEADLINE_UPDATED'     // ✓ Used
  | 'PROPOSAL_AMENDED'     // ✓ Used
  | 'CONCLUSION_ADDED'     // ✓ Used
  
  // Participants: 2 types
  | 'PARTICIPANT_ADDED'    // ❌ Never logged
  | 'PARTICIPANT_REMOVED'  // ❌ Never logged
  
  // Actions: 3 types
  | 'VOTE_RECORDED'        // ✓ Used
  | 'VOTE_UPDATED'         // ✓ Used
  | 'COMMENT_ADDED'        // ✓ Used
```

**Missing Types Not Defined**:
- DECISION_LAUNCHED (uses STATUS_CHANGED instead, but not logged)
- PROPOSAL_CREATED
- PROPOSAL_DELETED
- PROPOSAL_UPDATED

---

## Part 7: Recommendations for Completeness

### Priority 1: Critical Gaps
1. Add logging to manual decision launch (INVITED mode)
   - Create `logDecisionLaunched()` helper or use STATUS_CHANGED
   - Call in `/launch` route

2. Add logging to manual decision close
   - Modify `/close` route to call `logDecisionClosed(decisionId, userId, 'manual')`

3. Add external participant vote logging
   - Modify `/api/vote/[token]` POST to log votes
   - Use `actorName` for external participant name

4. Add participant management logging
   - Call `logParticipantAdded()` in `/participants` POST
   - Call `logParticipantRemoved()` in `/participants` DELETE

### Priority 2: Data Quality
1. Distinguish between VOTE_RECORDED and VOTE_UPDATED in anonymous votes
   - Add metadata or separate the logic
   - Currently both calls lose information about whether it's new or update

2. Log anonymous votes in PUBLIC_LINK mode
   - Call DecisionLog in `/api/public-vote/` routes

3. Log external participant comments
   - Add logging in `/api/vote/[token]` for comments

4. Implement context update logging
   - Create the parameter passing in decision update route
   - Call existing `logDecisionContextUpdated()` function

### Priority 3: New Event Types
1. Create PROPOSAL_CREATED event type
2. Create PROPOSAL_DELETED event type  
3. Replace STATUS_CHANGED with specific LAUNCHED/REOPENED calls
4. Consider DECISION_DELETED for soft deletes

### Priority 4: Testing
1. Create test file for decision-logger functions
2. Verify all logging paths
3. Test with different decision types
4. Test with different voting modes
5. Verify audit trail completeness

---

## Summary Table: Current vs Ideal Coverage

| Event Category | Current | Ideal | Gap |
|---|---|---|---|
| Decision Lifecycle | 2/4 | 4/4 | Launch, Reopen |
| Metadata Updates | 4/5 | 5/5 | Context |
| Participant Management | 0/2 | 2/2 | Add, Remove |
| Authenticated Voting | 2/2 | 2/2 | ✓ Complete |
| External Voting | 0/2 | 2/2 | Record, Update |
| Anonymous Voting | 0/2 | 2/2 | Record, Update |
| Comments | 1/3 | 3/3 | External, Anonymous |
| **TOTAL** | **11/22** | **22/22** | **50% Coverage** |

---

## Appendix: File References

### Files with Logging Calls
1. `/app/api/organizations/[slug]/decisions/route.ts` - CREATED, LAUNCHED
2. `/app/api/organizations/[slug]/decisions/[decisionId]/route.ts` - TITLE, DESCRIPTION, DEADLINE, PROPOSAL_AMENDED
3. `/app/api/organizations/[slug]/decisions/[decisionId]/vote/route.ts` - VOTE_RECORDED, VOTE_UPDATED
4. `/app/api/organizations/[slug]/decisions/[decisionId]/comments/route.ts` - COMMENT_ADDED
5. `/app/api/organizations/[slug]/decisions/[decisionId]/conclusion/route.ts` - CONCLUSION_ADDED
6. `/app/organizations/[slug]/decisions/[decisionId]/results/page.tsx` - CLOSED (auto)
7. `/lib/decision-logger.ts` - All logging helper functions

### Files WITHOUT Logging Calls (Should Have Them)
1. `/app/api/organizations/[slug]/decisions/[decisionId]/launch/route.ts` - Missing LAUNCHED
2. `/app/api/organizations/[slug]/decisions/[decisionId]/close/route.ts` - Missing CLOSED
3. `/app/api/organizations/[slug]/decisions/[decisionId]/participants/route.ts` - Missing PARTICIPANT_ADDED/REMOVED
4. `/app/api/vote/[token]/route.ts` - Missing VOTE_RECORDED/UPDATED/COMMENT_ADDED
5. `/app/api/public-vote/[orgSlug]/[publicSlug]/route.ts` - Missing VOTE_RECORDED/UPDATED

---

Generated: 2025-11-03
