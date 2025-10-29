# Migration : Système d'historique des décisions

Ce document décrit les étapes pour migrer la base de données et activer le système d'historique des décisions.

## Vue d'ensemble

Le système d'historique permet de tracer tous les événements liés à une décision :
- Création et modifications de décisions
- Votes et commentaires
- Changements de statut
- Ajout/retrait de participants

## Étapes de migration

### 1. Mettre à jour le schéma Prisma

Le schéma a été mis à jour avec le nouveau modèle `DecisionLog`. Voir `prisma/schema.prisma`.

### 2. Créer la table dans la base de données

#### Option A : Avec Prisma (recommandé)

```bash
# Générer le client Prisma
npm run db:generate

# Pousser les changements vers la base de données
npm run db:push
```

#### Option B : SQL manuel (si Prisma ne fonctionne pas)

Si vous rencontrez des problèmes avec Prisma (erreurs 403 lors du téléchargement des binaires), utilisez le script SQL :

```bash
sqlite3 prisma/dev.db < add-decision-logs-table.sql
```

Le script `add-decision-logs-table.sql` crée la table `decision_logs` avec les index appropriés.

### 3. Créer les logs rétroactifs

Pour les décisions existantes, un script crée automatiquement un log "CREATED" :

```bash
npx ts-node scripts/create-retroactive-logs.ts
```

Ce script :
- Récupère toutes les décisions existantes
- Crée un log "CREATED" pour chaque décision en utilisant sa date de création
- Évite les doublons en vérifiant les logs existants

### 4. Vérifier la migration

Après la migration, vérifiez que :
1. La table `decision_logs` existe
2. Les logs rétroactifs ont été créés
3. L'interface d'historique fonctionne (bouton "Historique" en haut à droite des pages de vote et résultats)

## Structure de la table DecisionLog

```sql
CREATE TABLE decision_logs (
    id TEXT PRIMARY KEY,
    decisionId TEXT NOT NULL,
    eventType TEXT NOT NULL,
    actorId TEXT,
    actorName TEXT,
    actorEmail TEXT,
    oldValue TEXT,
    newValue TEXT,
    metadata TEXT,
    createdAt DATETIME NOT NULL,
    FOREIGN KEY (decisionId) REFERENCES decisions(id) ON DELETE CASCADE,
    FOREIGN KEY (actorId) REFERENCES users(id) ON DELETE SET NULL
);
```

## Types d'événements

Les événements suivants sont tracés :

### Cycle de vie
- `CREATED` - Décision créée
- `STATUS_CHANGED` - Changement de statut
- `CLOSED` - Décision fermée
- `REOPENED` - Décision rouverte

### Modifications par le créateur
- `TITLE_UPDATED` - Titre modifié
- `DESCRIPTION_UPDATED` - Description modifiée
- `CONTEXT_UPDATED` - Contexte modifié
- `DEADLINE_UPDATED` - Date limite modifiée
- `PROPOSAL_AMENDED` - Proposition amendée (consensus)

### Participants
- `PARTICIPANT_ADDED` - Participant ajouté
- `PARTICIPANT_REMOVED` - Participant retiré

### Actions des participants
- `VOTE_RECORDED` - Vote enregistré
- `VOTE_UPDATED` - Vote modifié
- `COMMENT_ADDED` - Commentaire ajouté

## Règles de confidentialité

L'historique respecte la confidentialité selon le type de décision :

- **CONSENSUS** : Les votes sont publics
  - Exemple : "Marie a voté D'ACCORD"

- **MAJORITY** : Les votes sont anonymes
  - Exemple : "Un vote a été enregistré"

## Interface utilisateur

Le bouton "Historique" apparaît en haut à droite sur :
- Page de vote (`/organizations/[slug]/decisions/[decisionId]/vote`)
- Page de résultats (`/organizations/[slug]/decisions/[decisionId]/results`)

Un panneau latéral s'ouvre avec une timeline des événements, affichant :
- Date et heure de l'événement
- Icône selon le type d'événement
- Message descriptif
- Ordre chronologique inverse (plus récent en haut)

## Fichiers modifiés/créés

### Backend
- `prisma/schema.prisma` - Nouveau modèle DecisionLog
- `types/enums.ts` - Types d'événements
- `lib/decision-logger.ts` - Service de logging
- `app/api/organizations/[slug]/decisions/route.ts` - Logging création
- `app/api/organizations/[slug]/decisions/[decisionId]/route.ts` - Logging modifications
- `app/api/organizations/[slug]/decisions/[decisionId]/vote/route.ts` - Logging votes
- `app/api/organizations/[slug]/decisions/[decisionId]/comments/route.ts` - Logging commentaires
- `app/api/organizations/[slug]/decisions/[decisionId]/history/route.ts` - API historique

### Frontend
- `components/decisions/HistoryButton.tsx` - Bouton historique
- `components/decisions/HistoryPanel.tsx` - Panneau historique
- `app/organizations/[slug]/decisions/[decisionId]/vote/VotePageClient.tsx` - Intégration bouton
- `app/organizations/[slug]/decisions/[decisionId]/results/ResultsPageClient.tsx` - Intégration bouton

### Scripts et documentation
- `add-decision-logs-table.sql` - Script SQL manuel
- `scripts/create-retroactive-logs.ts` - Script logs rétroactifs
- `MIGRATION_HISTORY.md` - Cette documentation

## Dépannage

### Erreur : "table decision_logs doesn't exist"

Exécutez la migration :
```bash
npm run db:push
# ou
sqlite3 prisma/dev.db < add-decision-logs-table.sql
```

### Erreur Prisma : 403 Forbidden

Utilisez le script SQL manuel au lieu de Prisma :
```bash
sqlite3 prisma/dev.db < add-decision-logs-table.sql
```

### Les logs rétroactifs ne se créent pas

Vérifiez que :
1. La table `decision_logs` existe
2. Le client Prisma est à jour (`npm run db:generate`)
3. Les décisions existent dans la base de données

Réexécutez le script :
```bash
npx ts-node scripts/create-retroactive-logs.ts
```
