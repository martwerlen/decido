-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "decisionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "proposals_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decisions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "decision_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "userId" TEXT,
    "externalEmail" TEXT,
    "externalName" TEXT,
    "invitedVia" TEXT NOT NULL,
    "teamId" TEXT,
    "hasVoted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "decision_participants_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decisions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "decision_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "proposal_votes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "proposal_votes_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "proposal_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "amendedProposal" TEXT,
    "result" TEXT,
    "resultDetails" TEXT,
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
INSERT INTO "new_decisions" ("context", "createdAt", "creatorId", "decidedAt", "decisionType", "description", "endDate", "id", "organizationId", "result", "resultDetails", "startDate", "status", "teamId", "title", "updatedAt") SELECT "context", "createdAt", "creatorId", "decidedAt", "decisionType", "description", "endDate", "id", "organizationId", "result", "resultDetails", "startDate", "status", "teamId", "title", "updatedAt" FROM "decisions";
DROP TABLE "decisions";
ALTER TABLE "new_decisions" RENAME TO "decisions";
CREATE UNIQUE INDEX "decisions_publicToken_key" ON "decisions"("publicToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "decision_participants_decisionId_userId_key" ON "decision_participants"("decisionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "decision_participants_decisionId_externalEmail_key" ON "decision_participants"("decisionId", "externalEmail");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_votes_userId_decisionId_key" ON "proposal_votes"("userId", "decisionId");
