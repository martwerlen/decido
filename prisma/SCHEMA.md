# Documentation du schéma de données

## Vue d'ensemble

Le schéma de données de Decidoo est organisé autour de 4 concepts principaux :

1. **Gestion des utilisateurs** (User, Account, Session)
2. **Structure organisationnelle** (Organization, Team, Members)
3. **Processus décisionnel** (Decision, Vote)
4. **Communication** (Comment, Tag)

## Relations principales

```
User
 ├─ OrganizationMember (peut appartenir à plusieurs orgs)
 │   └─ TeamMember (peut être dans plusieurs équipes)
 ├─ Decision (crée des décisions)
 ├─ Vote (vote sur des décisions)
 └─ Comment (commente des décisions)

Organization
 ├─ OrganizationMember (a des membres)
 ├─ Team (contient des équipes)
 └─ Decision (contient des décisions)

Decision
 ├─ Vote (reçoit des votes)
 ├─ Comment (reçoit des commentaires)
 └─ Tag (peut avoir des tags)
```

## Détails des modèles

### 👤 User (Utilisateur)

Représente un utilisateur de la plateforme.

**Champs clés :**
- `email` : Email unique
- `name` : Nom d'affichage
- `password` : Hash du mot de passe (nullable pour OAuth)

**Relations :**
- Peut être membre de plusieurs organisations
- Peut créer des décisions
- Peut voter et commenter

### 🏢 Organization (Organisation)

Entité principale regroupant des utilisateurs (entreprise, association, collectif...).

**Champs clés :**
- `name` : Nom de l'organisation
- `slug` : Identifiant URL unique (ex: "mon-entreprise")
- `description` : Description optionnelle

**Relations :**
- Contient des membres via `OrganizationMember`
- Peut avoir plusieurs équipes (`Team`)
- Héberge des décisions

### 👥 Team (Équipe)

Sous-groupe au sein d'une organisation.

**Champs clés :**
- `name` : Nom de l'équipe
- `organizationId` : Organisation parente

**Relations :**
- Appartient à une organisation
- Contient des membres via `TeamMember`
- Peut avoir ses propres décisions

### OrganizationMember & TeamMember

Tables de liaison pour gérer l'appartenance.

**Hiérarchie :**
1. Un `User` rejoint une `Organization` → `OrganizationMember`
2. Un `OrganizationMember` rejoint une `Team` → `TeamMember`

**Rôles disponibles :**
- `OWNER` : Propriétaire (tous les droits)
- `ADMIN` : Administrateur
- `MEMBER` : Membre standard

### 📋 Decision (Décision)

Cœur du système : une proposition soumise au vote.

**Champs clés :**
- `title` : Titre de la décision
- `description` : Description détaillée
- `decisionType` : Type de modalité décisionnelle
- `status` : État actuel (DRAFT, OPEN, CLOSED...)
- `result` : Résultat final (APPROVED, REJECTED...)

**Types de décision :**

| Type | Description | Logique |
|------|-------------|---------|
| `CONSENSUS` | Unanimité | Tous doivent voter support fort |
| `CONSENT` | Consentement | Pas d'objection majeure (pas de BLOCK) |
| `MAJORITY` | Majorité simple | Plus de pour que de contre |
| `SUPERMAJORITY` | Super-majorité | ≥ 2/3 de votes positifs |
| `WEIGHTED_VOTE` | Vote nuancé | Score pondéré > 0 |
| `ADVISORY` | Consultatif | Toujours approuvé (informatif) |

**Statuts :**
- `DRAFT` : Brouillon (non publié)
- `OPEN` : Ouvert au vote
- `CLOSED` : Vote terminé
- `IMPLEMENTED` : Décision mise en œuvre
- `ARCHIVED` : Archivée

**Résultats possibles :**
- `APPROVED` : Approuvée
- `REJECTED` : Rejetée
- `BLOCKED` : Bloquée (objection en mode consentement)
- `WITHDRAWN` : Retirée

### 🗳️ Vote

Représente le vote d'un utilisateur sur une décision.

**Champs clés :**
- `value` : Valeur du vote (STRONG_SUPPORT, OPPOSE...)
- `weight` : Poids personnalisé (pour votes nuancés)
- `comment` : Commentaire optionnel expliquant le vote

**Valeurs de vote :**

| Valeur | Symbole | Poids | Description |
|--------|---------|-------|-------------|
| `STRONG_SUPPORT` | ++ | +3 | Soutien fort |
| `SUPPORT` | + | +2 | Soutien |
| `WEAK_SUPPORT` | ~+ | +1 | Soutien faible |
| `ABSTAIN` | 0 | 0 | Abstention |
| `WEAK_OPPOSE` | ~- | -1 | Opposition faible |
| `OPPOSE` | - | -2 | Opposition |
| `STRONG_OPPOSE` | -- | -3 | Opposition forte |
| `BLOCK` | 🚫 | -10 | Veto (consentement) |

**Contrainte :** Un utilisateur ne peut voter qu'une fois par décision.

### 💬 Comment (Commentaire)

Discussion autour d'une décision.

**Fonctionnalités :**
- Commentaires hiérarchiques (réponses possibles via `parentId`)
- Thread de discussion
- Horodatage des modifications

### 🏷️ Tag

Catégorisation des décisions.

**Utilisation :**
- Organiser les décisions par thème
- Faciliter la recherche
- Couleur personnalisable pour l'affichage

## Exemples de requêtes

### Créer une décision

```typescript
const decision = await prisma.decision.create({
  data: {
    title: "Adopter le télétravail permanent",
    description: "Proposition de passer en 100% remote",
    decisionType: "CONSENT",
    status: "OPEN",
    creatorId: user.id,
    organizationId: org.id,
    teamId: team.id,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
  },
})
```

### Voter sur une décision

```typescript
const vote = await prisma.vote.create({
  data: {
    userId: user.id,
    decisionId: decision.id,
    value: "SUPPORT",
    weight: 2,
    comment: "Excellente idée pour l'équilibre vie pro/perso",
  },
})
```

### Récupérer les décisions avec votes

```typescript
const decisions = await prisma.decision.findMany({
  where: {
    organizationId: org.id,
    status: "OPEN",
  },
  include: {
    creator: {
      select: { name: true, email: true },
    },
    votes: {
      include: {
        user: {
          select: { name: true },
        },
      },
    },
    _count: {
      select: { votes: true, comments: true },
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
})
```

## Bonnes pratiques

### 1. Transactions pour cohérence

Lors de la création de votes, utiliser des transactions :

```typescript
await prisma.$transaction(async (tx) => {
  // Créer le vote
  const vote = await tx.vote.create({ ... })

  // Vérifier si tous ont voté
  const voteCount = await tx.vote.count({ where: { decisionId } })

  // Si oui, calculer le résultat
  if (voteCount === totalMembers) {
    await tx.decision.update({
      where: { id: decisionId },
      data: {
        status: "CLOSED",
        result: calculateResult(...),
        decidedAt: new Date(),
      },
    })
  }
})
```

### 2. Indexes pour performance

Des index sont automatiquement créés sur :
- Relations (clés étrangères)
- Champs uniques (`email`, `slug`, etc.)

Pour de meilleures performances sur de grandes bases, considérer :
```prisma
@@index([organizationId, status])
@@index([createdAt])
```

### 3. Validation métier

Le schéma garantit l'intégrité référentielle, mais la logique métier doit être dans `/lib/decision-logic.ts` :
- Vérifier les permissions avant création
- Valider que l'utilisateur peut voter
- Calculer le résultat selon le type de décision

## Évolutions futures possibles

1. **Notifications** : Table `Notification` pour alerter des nouveaux votes
2. **Historique** : Versioning des décisions modifiées
3. **Templates** : Modèles de décisions pré-configurés
4. **Délégation** : Permettre de déléguer son vote
5. **Quorum** : Nombre minimum de votants requis
6. **Pondération** : Poids différents selon le rôle/ancienneté

---

**Note :** Ce schéma est évolutif. Les migrations Prisma permettent de faire évoluer la structure sans perte de données.
