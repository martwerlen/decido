# Fonctionnalités de gestion des organisations et invitations

## Vue d'ensemble

Ce document décrit les nouvelles fonctionnalités de création d'organisations et d'invitation de membres dans Decidoo.

## Fonctionnalités implémentées

### 1. Création d'organisation

**Route :** `/organizations/new`

Permet de créer une nouvelle organisation avec :
- Nom de l'organisation (requis)
- Description (optionnel)
- Le créateur devient automatiquement OWNER de l'organisation
- Un slug unique est généré automatiquement à partir du nom

**API :** `POST /api/organizations`

```json
{
  "name": "Mon Organisation",
  "description": "Description de mon organisation"
}
```

### 2. Gestion des membres

**Route :** `/organizations/[id]/members`

Cette page permet de :
- Voir tous les membres de l'organisation (avec compte utilisateur)
- Voir les membres sans compte (ajoutés manuellement)
- Voir les invitations en attente
- Ajouter de nouveaux membres

#### Types de membres

**a) Membres avec compte utilisateur**
- Possèdent un email et peuvent se connecter
- Ont un rôle : OWNER, ADMIN, ou MEMBER
- Peuvent voter et participer aux décisions

**b) Membres sans compte**
- Ajoutés manuellement sans email
- Prénom, nom et fonction (optionnel)
- Ne peuvent pas se connecter ni participer aux votes
- Utile pour garder une trace de tous les membres d'une équipe

**c) Invitations en attente**
- Invitations envoyées par email qui n'ont pas encore été acceptées
- Expirent après 7 jours
- Peuvent être renvoyées si nécessaire

### 3. Invitation de membres

**API :** `POST /api/organizations/[id]/members`

Deux modes d'ajout :

#### Avec email (invitation)
```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "position": "Développeur",
  "email": "jean.dupont@example.com",
  "role": "MEMBER",
  "sendInvitation": true
}
```

- Si l'utilisateur existe déjà : il est ajouté directement à l'organisation
- Sinon : une invitation est créée et envoyée par email
- L'invitation contient un lien unique valide 7 jours

#### Sans email (membre manuel)
```json
{
  "firstName": "Marie",
  "lastName": "Martin",
  "position": "Chef de projet",
  "email": "",
  "sendInvitation": false
}
```

- Crée un membre sans compte utilisateur
- Utile pour documenter tous les membres d'une équipe

### 4. Acceptation d'invitation

**Route :** `/invitations/accept?token=xxxxx`

Accessible via le lien dans l'email d'invitation.

**Deux scénarios :**

#### Utilisateur existant
- L'utilisateur est reconnu par son email
- Il accepte l'invitation et rejoint automatiquement l'organisation
- Il peut se connecter avec son compte existant

#### Nouvel utilisateur
- L'utilisateur crée son mot de passe
- Un compte est créé automatiquement
- Il rejoint l'organisation avec le rôle spécifié dans l'invitation
- Un email de bienvenue est envoyé

**API :** `POST /api/invitations/accept`

```json
{
  "token": "xxxxx",
  "password": "motdepasse" // Seulement pour les nouveaux utilisateurs
}
```

## Emails

Deux types d'emails sont envoyés :

### 1. Email d'invitation

Envoyé lors de l'invitation d'un nouveau membre :
- Contient les informations sur l'organisation
- Le nom de la personne qui a invité
- Un lien unique pour accepter l'invitation
- Expire après 7 jours

### 2. Email de bienvenue

Envoyé après la création d'un compte via une invitation :
- Confirme la création du compte
- Confirme l'adhésion à l'organisation
- Fournit un lien pour se connecter

## Modèle de données

### Nouveaux modèles Prisma

#### NonUserMember
Membres sans compte utilisateur :
```prisma
model NonUserMember {
  id             String   @id @default(cuid())
  firstName      String
  lastName       String
  position       String?
  organizationId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

#### Invitation
Invitations pour rejoindre une organisation :
```prisma
model Invitation {
  id             String           @id @default(cuid())
  email          String
  token          String           @unique
  firstName      String
  lastName       String
  position       String?
  role           MemberRole       @default(MEMBER)
  status         InvitationStatus @default(PENDING)
  organizationId String
  invitedById    String
  expiresAt      DateTime
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invitedBy    User         @relation(fields: [invitedById], references: [id], onDelete: Cascade)
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}
```

## Configuration

### Configuration de l'envoi d'emails

Decidoo utilise **Nodemailer** qui supporte plusieurs méthodes d'envoi d'emails, sans nécessiter de créer un compte sur un service externe.

Pour un guide complet, consultez [EMAIL_SETUP.md](EMAIL_SETUP.md).

#### Mode Console (par défaut - Développement)

**Aucune configuration requise !** Les emails s'affichent dans la console.

```env
# Rien à ajouter, c'est le mode par défaut
EMAIL_PROVIDER="console"
```

#### Mode Ethereal (Test)

**Aucune configuration requise !** Les emails sont visibles en ligne avec rendu HTML.

```env
EMAIL_PROVIDER="ethereal"
```

Les identifiants et URLs de preview s'affichent automatiquement dans la console.

#### Mode Gmail (Production Simple)

Utilisez votre compte Gmail existant :

```env
EMAIL_PROVIDER="gmail"
EMAIL_USER="votre.email@gmail.com"
EMAIL_PASSWORD="votre-app-password"
FROM_EMAIL="votre.email@gmail.com"
FROM_NAME="Decidoo"
```

**Pour obtenir un App Password Gmail :**
1. Allez sur [myaccount.google.com/security](https://myaccount.google.com/security)
2. Activez la validation en 2 étapes
3. Créez un "App Password" pour Mail
4. Utilisez ce mot de passe dans `EMAIL_PASSWORD`

#### Mode SMTP (Production Avancée)

Utilisez n'importe quel serveur SMTP :

```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-username"
SMTP_PASSWORD="your-password"
FROM_EMAIL="noreply@votredomaine.com"
FROM_NAME="Decidoo"
```

### Recommandations

- **Développement** : `EMAIL_PROVIDER="console"` (par défaut)
- **Tests** : `EMAIL_PROVIDER="ethereal"`
- **Production** : `EMAIL_PROVIDER="gmail"` ou `EMAIL_PROVIDER="smtp"`

## Sécurité

- Seuls les OWNER et ADMIN peuvent inviter des membres
- Les invitations expirent après 7 jours
- Chaque invitation a un token unique et aléatoire
- Les mots de passe sont hachés avec bcrypt (12 rounds)
- Les emails sont vérifiés automatiquement via l'invitation

## Tests

Pour tester les fonctionnalités :

1. **Créer une organisation :**
   - Allez sur `/organizations/new`
   - Remplissez le formulaire
   - Vous êtes redirigé vers la page de gestion des membres

2. **Inviter un membre avec email :**
   - Sur `/organizations/[id]/members`
   - Cliquez sur "Ajouter un membre"
   - Remplissez le formulaire avec un email
   - Le membre reçoit un email d'invitation

3. **Ajouter un membre sans email :**
   - Sur `/organizations/[id]/members`
   - Cliquez sur "Ajouter un membre"
   - Remplissez le formulaire sans email
   - Le membre apparaît dans "Membres sans compte"

4. **Accepter une invitation :**
   - Cliquez sur le lien dans l'email
   - Si nouveau : créez votre mot de passe
   - Si existant : acceptez directement
   - Vous rejoignez l'organisation

## API Endpoints

### Organisations

- `POST /api/organizations` - Créer une organisation
- `GET /api/organizations` - Lister les organisations de l'utilisateur

### Membres

- `POST /api/organizations/[id]/members` - Ajouter/inviter un membre
- `GET /api/organizations/[id]/members` - Lister les membres

### Invitations

- `POST /api/invitations/accept` - Accepter une invitation
- `GET /api/invitations/accept?token=xxx` - Récupérer les infos d'une invitation

## Améliorations futures possibles

- Renvoyer une invitation expirée
- Annuler une invitation en attente
- Supprimer un membre
- Modifier le rôle d'un membre
- Importer plusieurs membres en masse (CSV)
- Historique des invitations
- Notifications in-app en plus des emails
