-- Création de la base de données SQLite pour Decido

-- Table users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password TEXT,
    emailVerified DATETIME,
    image TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table accounts (NextAuth)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    providerAccountId TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(provider, providerAccountId)
);

-- Table sessions (NextAuth)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    sessionToken TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    expires DATETIME NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Table organizations
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table organization_members
CREATE TABLE IF NOT EXISTS organization_members (
    id TEXT PRIMARY KEY,
    role TEXT DEFAULT 'MEMBER' NOT NULL,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    userId TEXT NOT NULL,
    organizationId TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(userId, organizationId)
);

-- Table teams
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    organizationId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Table team_members
CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    organizationMemberId TEXT NOT NULL,
    teamId TEXT NOT NULL,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizationMemberId) REFERENCES organization_members(id) ON DELETE CASCADE,
    FOREIGN KEY (teamId) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE(organizationMemberId, teamId)
);

-- Table decisions
CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    context TEXT,
    decisionType TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT' NOT NULL,
    result TEXT,
    resultDetails TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    startDate DATETIME,
    endDate DATETIME,
    decidedAt DATETIME,
    creatorId TEXT NOT NULL,
    organizationId TEXT NOT NULL,
    teamId TEXT,
    FOREIGN KEY (creatorId) REFERENCES users(id),
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (teamId) REFERENCES teams(id) ON DELETE SET NULL
);

-- Table votes
CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    weight INTEGER DEFAULT 1,
    comment TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    userId TEXT NOT NULL,
    decisionId TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (decisionId) REFERENCES decisions(id) ON DELETE CASCADE,
    UNIQUE(userId, decisionId)
);

-- Table comments
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    userId TEXT NOT NULL,
    decisionId TEXT NOT NULL,
    parentId TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (decisionId) REFERENCES decisions(id) ON DELETE CASCADE,
    FOREIGN KEY (parentId) REFERENCES comments(id)
);

-- Table tags
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table decision_tags
CREATE TABLE IF NOT EXISTS decision_tags (
    decisionId TEXT NOT NULL,
    tagId TEXT NOT NULL,
    PRIMARY KEY (decisionId, tagId),
    FOREIGN KEY (decisionId) REFERENCES decisions(id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(sessionToken);
CREATE INDEX IF NOT EXISTS idx_decisions_creator ON decisions(creatorId);
CREATE INDEX IF NOT EXISTS idx_decisions_org ON decisions(organizationId);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(userId);
CREATE INDEX IF NOT EXISTS idx_votes_decision ON votes(decisionId);
