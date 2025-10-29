# Configuration de Decidoo

Guide rapide pour initialiser l'application Decidoo.

## Prérequis

- Node.js 18+ installé
- npm ou yarn

## Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer l'environnement

Copier le fichier d'exemple des variables d'environnement :

```bash
cp .env.example .env
```

Le fichier `.env` contient déjà des valeurs par défaut pour le développement local.

### 3. Initialiser la base de données

Exécuter le script d'initialisation pour créer la base de données SQLite et les tables :

```bash
node scripts/init-database.js
```

Vous devriez voir :
```
🔧 Initialisation de la base de données SQLite...
📦 Base de données: /path/to/dev.db
📝 Création des tables...
✅ Tables créées avec succès!
```

### 4. Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur http://localhost:3000

## Configuration optionnelle

### Emails (Resend)

Par défaut, les emails sont affichés dans la console. Pour envoyer de vrais emails :

1. Créez un compte sur https://resend.com
2. Générez une clé API
3. Ajoutez-la dans `.env` :

```env
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@votredomaine.com"
```

### Base de données PostgreSQL (Production)

Pour utiliser PostgreSQL au lieu de SQLite :

1. Modifier `DATABASE_URL` dans `.env` :
```env
DATABASE_URL="postgresql://user:password@localhost:5432/decidoo?schema=public"
```

2. Utiliser les migrations Prisma :
```bash
npx prisma migrate deploy
```

## Scripts utiles

- `npm run dev` - Lancer le serveur de développement
- `npm run build` - Construire l'application pour la production
- `npm start` - Lancer l'application en production
- `npm run lint` - Vérifier le code avec ESLint
- `node scripts/init-database.js` - Réinitialiser la base de données

## Structure du projet

```
decidoo/
├── app/                    # Pages et routes Next.js
│   ├── api/               # Routes API
│   ├── auth/              # Pages d'authentification
│   └── organizations/     # Pages des organisations
├── components/            # Composants React réutilisables
├── lib/                   # Utilitaires et configurations
│   ├── auth.ts           # Configuration NextAuth
│   ├── email.ts          # Service d'envoi d'emails
│   └── prisma.ts         # Client Prisma
├── prisma/               # Schéma de base de données
│   └── schema.prisma     # Définition du modèle de données
├── scripts/              # Scripts d'initialisation
│   ├── create-tables.sql # Schéma SQL
│   └── init-database.js  # Script d'init de la DB
└── public/               # Fichiers statiques
```

## Fonctionnalités

- ✅ Authentification utilisateur (NextAuth v5)
- ✅ Gestion des organisations
- ✅ Invitation de membres par email
- ✅ Membres sans compte (annuaire)
- ✅ Dashboard dynamique
- ✅ Gestion des rôles (Owner, Admin, Member)

## Dépannage

### "Module not found: resend"

L'application utilise un import dynamique de Resend. Si vous voyez cette erreur :

```bash
rm -rf node_modules .next
npm install
```

### "Erreur lors de la récupération des membres"

La base de données n'est pas initialisée. Exécutez :

```bash
node scripts/init-database.js
```

### Port 3000 déjà utilisé

Next.js utilisera automatiquement le port 3001 ou suivant.
Vous pouvez aussi spécifier un port :

```bash
PORT=3002 npm run dev
```

## Support

Pour toute question ou problème, consultez la documentation ou ouvrez une issue sur GitHub.
