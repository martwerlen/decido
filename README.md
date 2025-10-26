# Decido - Plateforme de prise de décision collaborative

Application de gestion de décisions pour organisations avec différentes modalités décisionnelles.

## 🎯 Fonctionnalités

- **Multi-organisations** : Gestion de plusieurs organisations et équipes
- **Modalités décisionnelles** :
  - ✅ **Consensus** : Unanimité requise
  - 🤝 **Consentement** : Pas d'objection majeure
  - 📊 **Vote nuancé** : Échelle de préférences (-3 à +3)
  - 🗳️ **Vote majoritaire** : Simple ou qualifié
  - 💬 **Consultatif** : Avis sans décision contraignante
- **Registre des décisions** : Historique complet et traçabilité
- **Discussions** : Commentaires et débats sur chaque décision

## 🏗️ Architecture

### Stack technique

- **Frontend** : Next.js 15 + TypeScript + Tailwind CSS
- **Backend** : Next.js API Routes
- **Base de données** : PostgreSQL + Prisma ORM
- **Authentification** : NextAuth.js

### Structure du projet

```
decido/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/            # Composants React réutilisables
├── lib/                   # Logique métier et utilitaires
│   ├── prisma.ts         # Client Prisma
│   └── decision-logic.ts # Logique de calcul des décisions
├── types/                # Types TypeScript
│   └── index.ts
├── prisma/               # Schéma DB et migrations
│   └── schema.prisma
└── package.json
```

## 📊 Modèle de données

### Entités principales

1. **User** : Utilisateurs de la plateforme
2. **Organization** : Organisations (entreprises, associations...)
3. **Team** : Équipes au sein d'une organisation
4. **Decision** : Décisions à prendre
5. **Vote** : Votes des membres sur les décisions
6. **Comment** : Discussions et commentaires

### Types de décisions

```typescript
enum DecisionType {
  CONSENSUS       // Unanimité requise
  CONSENT         // Pas d'objection majeure
  MAJORITY        // Vote majoritaire simple
  SUPERMAJORITY   // Vote qualifié (2/3)
  WEIGHTED_VOTE   // Vote nuancé avec échelle
  ADVISORY        // Consultatif
}
```

### Valeurs de vote

```typescript
enum VoteValue {
  STRONG_SUPPORT    // ++ (poids +3)
  SUPPORT           // +  (poids +2)
  WEAK_SUPPORT      // ~+ (poids +1)
  ABSTAIN           // 0
  WEAK_OPPOSE       // ~- (poids -1)
  OPPOSE            // -  (poids -2)
  STRONG_OPPOSE     // -- (poids -3)
  BLOCK             // Veto (consentement uniquement)
}
```

## 🚀 Installation

### Prérequis

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### Configuration

1. **Cloner le projet**
```bash
git clone <votre-repo>
cd decido
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer la base de données**

Créer un fichier `.env` :
```bash
cp .env.example .env
```

Modifier la variable `DATABASE_URL` avec vos credentials PostgreSQL :
```
DATABASE_URL="postgresql://user:password@localhost:5432/decido?schema=public"
```

4. **Générer le client Prisma**
```bash
npm run db:generate
```

5. **Créer la base de données**
```bash
npm run db:push
```

6. **Lancer l'application**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## 📝 Scripts disponibles

- `npm run dev` : Lancer en mode développement
- `npm run build` : Build de production
- `npm run start` : Lancer en production
- `npm run lint` : Linter le code
- `npm run db:generate` : Générer le client Prisma
- `npm run db:push` : Pousser le schéma vers la DB (dev)
- `npm run db:migrate` : Créer une migration
- `npm run db:studio` : Ouvrir Prisma Studio (interface DB)

## 🎨 Logique de décision

Le calcul du résultat varie selon le type de décision :

### Consensus
- ✅ Approuvé si **tous** les votes sont "Support fort"
- ❌ Rejeté sinon

### Consentement
- 🚫 Bloqué si **un seul** vote "Block"
- ❌ Rejeté si "Opposition forte"
- ✅ Approuvé sinon

### Vote nuancé (pondéré)
- Calcul du score : `Σ (valeur_vote × poids)`
- ✅ Approuvé si score > 0
- ❌ Rejeté si score ≤ 0

### Majorité simple
- ✅ Approuvé si votes positifs > votes négatifs

### Super-majorité
- ✅ Approuvé si votes positifs ≥ 2/3 du total

## 🔐 Authentification

NextAuth.js permet :
- Inscription / Connexion par email + mot de passe
- OAuth (Google, GitHub... extensible)
- Gestion de sessions sécurisées

## 📱 Migration vers app mobile

Le projet est conçu pour faciliter une future migration :
- Logique métier isolée dans `/lib`
- Types TypeScript partagés
- API REST via Next.js API Routes
- Possible utilisation de React Native avec code partagé

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

MIT

---

**Fait avec ❤️ pour la gouvernance collaborative**
