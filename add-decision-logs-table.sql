-- Script SQL pour ajouter la table DecisionLog à la base de données SQLite

CREATE TABLE IF NOT EXISTS decision_logs (
    id TEXT PRIMARY KEY NOT NULL,
    decisionId TEXT NOT NULL,
    eventType TEXT NOT NULL,
    actorId TEXT,
    actorName TEXT,
    actorEmail TEXT,
    oldValue TEXT,
    newValue TEXT,
    metadata TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (decisionId) REFERENCES decisions(id) ON DELETE CASCADE,
    FOREIGN KEY (actorId) REFERENCES users(id) ON DELETE SET NULL
);

-- Index pour améliorer les performances de requêtes
CREATE INDEX IF NOT EXISTS idx_decision_logs_decisionId ON decision_logs(decisionId);
CREATE INDEX IF NOT EXISTS idx_decision_logs_createdAt ON decision_logs(createdAt);
CREATE INDEX IF NOT EXISTS idx_decision_logs_eventType ON decision_logs(eventType);
