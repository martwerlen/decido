-- Migration: Renommer nuancedSlug en publicSlug et ajouter AnonymousVoteLog
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- 1. Recreate decisions table with publicSlug instead of nuancedSlug
CREATE TABLE "new_decisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "context" TEXT,
    "decisionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "votingMode" TEXT NOT NULL DEFAULT 'INVITED',
    "publicToken" TEXT,
    "initialProposal" TEXT,
    "proposal" TEXT,
    "nuancedScale" TEXT,
    "nuancedWinnerCount" INTEGER,
    "publicSlug" TEXT,
    "result" TEXT,
    "resultDetails" TEXT,
    "conclusion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "decidedAt" DATETIME,
    "creatorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT,
    CONSTRAINT "decisions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "decisions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "decisions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 2. Copy data from old table (migrate nuancedSlug to publicSlug)
INSERT INTO "new_decisions" SELECT
    "id",
    "title",
    "description",
    "context",
    "decisionType",
    "status",
    "votingMode",
    "publicToken",
    "initialProposal",
    "proposal",
    "nuancedScale",
    "nuancedWinnerCount",
    "nuancedSlug" as "publicSlug",  -- Migration nuancedSlug -> publicSlug
    "result",
    "resultDetails",
    "conclusion",
    "createdAt",
    "updatedAt",
    "startDate",
    "endDate",
    "decidedAt",
    "creatorId",
    "organizationId",
    "teamId"
FROM "decisions";

-- 3. Drop old table
DROP TABLE "decisions";

-- 4. Rename new table
ALTER TABLE "new_decisions" RENAME TO "decisions";

-- 5. Recreate unique indexes
CREATE UNIQUE INDEX "decisions_publicToken_key" ON "decisions"("publicToken");
CREATE UNIQUE INDEX "decisions_organizationId_publicSlug_key" ON "decisions"("organizationId", "publicSlug");

-- 6. Create AnonymousVoteLog table
CREATE TABLE "anonymous_vote_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "votedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "anonymous_vote_logs_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decisions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 7. Create unique index on AnonymousVoteLog
CREATE UNIQUE INDEX "anonymous_vote_logs_decisionId_ipHash_key" ON "anonymous_vote_logs"("decisionId", "ipHash");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
