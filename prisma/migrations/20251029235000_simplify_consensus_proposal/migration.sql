-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Add proposal column with initial values from amendedProposal or initialProposal
-- SQLite doesn't support adding columns with complex logic, so we need to recreate the table

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

-- Copy data from old table
-- If amendedProposal exists, use it; otherwise use initialProposal
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
    COALESCE("amendedProposal", "initialProposal") as "proposal",
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

-- Drop old table
DROP TABLE "decisions";

-- Rename new table
ALTER TABLE "new_decisions" RENAME TO "decisions";

-- Recreate unique index on publicToken
CREATE UNIQUE INDEX "decisions_publicToken_key" ON "decisions"("publicToken");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
