-- CreateIndex
CREATE UNIQUE INDEX "decision_participants_token_key" ON "decision_participants"("token");

-- AlterTable: Add token and tokenExpiresAt to decision_participants
ALTER TABLE "decision_participants" ADD COLUMN "token" TEXT;
ALTER TABLE "decision_participants" ADD COLUMN "tokenExpiresAt" DATETIME;

-- AlterTable: Make userId nullable and add externalParticipantId to votes
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
CREATE TABLE "votes_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    "decisionId" TEXT NOT NULL,
    "externalParticipantId" TEXT,
    CONSTRAINT "votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "votes_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decisions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "votes_externalParticipantId_fkey" FOREIGN KEY ("externalParticipantId") REFERENCES "decision_participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy existing data
INSERT INTO "votes_new" SELECT "id", "value", "weight", "comment", "createdAt", "updatedAt", "userId", "decisionId", NULL FROM "votes";

-- Drop old table and rename new one
DROP TABLE "votes";
ALTER TABLE "votes_new" RENAME TO "votes";

-- Recreate indexes
CREATE UNIQUE INDEX "votes_userId_decisionId_key" ON "votes"("userId", "decisionId");
CREATE UNIQUE INDEX "votes_externalParticipantId_decisionId_key" ON "votes"("externalParticipantId", "decisionId");

-- AlterTable: Make userId nullable and add externalParticipantId to proposal_votes
CREATE TABLE "proposal_votes_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT,
    "decisionId" TEXT NOT NULL,
    "externalParticipantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "proposal_votes_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "proposal_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "proposal_votes_externalParticipantId_fkey" FOREIGN KEY ("externalParticipantId") REFERENCES "decision_participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy existing data
INSERT INTO "proposal_votes_new" SELECT "id", "proposalId", "userId", "decisionId", NULL, "createdAt", "updatedAt" FROM "proposal_votes";

-- Drop old table and rename new one
DROP TABLE "proposal_votes";
ALTER TABLE "proposal_votes_new" RENAME TO "proposal_votes";

-- Recreate indexes
CREATE UNIQUE INDEX "proposal_votes_userId_decisionId_key" ON "proposal_votes"("userId", "decisionId");
CREATE UNIQUE INDEX "proposal_votes_externalParticipantId_decisionId_key" ON "proposal_votes"("externalParticipantId", "decisionId");
