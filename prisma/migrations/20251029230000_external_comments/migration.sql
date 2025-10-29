-- AlterTable: Make userId nullable and add externalParticipantId to comments
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

CREATE TABLE "comments_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    "decisionId" TEXT NOT NULL,
    "parentId" TEXT,
    "externalParticipantId" TEXT,
    CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comments_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decisions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "comments_externalParticipantId_fkey" FOREIGN KEY ("externalParticipantId") REFERENCES "decision_participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy existing data
INSERT INTO "comments_new" SELECT "id", "content", "createdAt", "updatedAt", "userId", "decisionId", "parentId", NULL FROM "comments";

-- Drop old table and rename new one
DROP TABLE "comments";
ALTER TABLE "comments_new" RENAME TO "comments";
