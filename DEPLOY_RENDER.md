# 🚀 Guide de déploiement sur Render

Ce guide vous accompagne pas à pas pour déployer Decidoo sur Render avec PostgreSQL et les cron jobs automatiques.

---

## 📋 Prérequis

- [x] Compte GitHub avec le repository Decidoo
- [x] Compte Render (gratuit) : https://render.com
- [ ] Compte Resend pour les emails (optionnel pour tester) : https://resend.com
- [ ] 30 minutes de temps disponible

---

## 🎯 Architecture finale

```
┌─────────────────────────────────────────┐
│  Render Web Service (Next.js)          │
│  URL: https://decidoo-app.onrender.com │
└─────────────────────────────────────────┘
              ↓ connexion
┌─────────────────────────────────────────┐
│  Render PostgreSQL Database             │
│  decidoo-db (gratuit ou $7/mois)        │
└─────────────────────────────────────────┘
              ↓ appels API
┌─────────────────────────────────────────┐
│  Render Cron Jobs (4 services)          │
│  - Fermer décisions expirées (1h)       │
│  - Envoyer rappels (9h/jour)            │
│  - Nettoyer tokens (2h/jour)            │
│  - Vérifier stades CONSENT (15min)      │
└─────────────────────────────────────────┘
```

---

## 📝 Étape 1 : Préparer le projet

### 1.1 Modifier le schema.prisma pour PostgreSQL

**IMPORTANT** : Actuellement, votre schema utilise SQLite. Pour Render, vous devez utiliser PostgreSQL.

Ouvrez `prisma/schema.prisma` et modifiez la ligne 9 :

```prisma
// AVANT (SQLite - local uniquement)
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// APRÈS (PostgreSQL - production)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**💡 Astuce** : Si vous voulez garder SQLite en local et PostgreSQL en prod, vous pouvez :
1. Créer une branche `production` avec PostgreSQL
2. OU utiliser des variables d'environnement conditionnelles (plus complexe)

### 1.2 Vérifier que tous les fichiers sont commités

```bash
# Ajouter les nouveaux fichiers
git add .

# Vérifier les changements
git status

# Commiter
git commit -m "feat: Add Render deployment configuration with cron jobs"

# Pousser sur GitHub
git push origin claude/find-web-hosting-01H9DPrwURLMLBCfbSD4yWxX
```

**Note** : Si vous n'avez pas encore de branche `main` ou `master`, créez-la :
```bash
git checkout -b main
git push origin main
```

---

## 🗄️ Étape 2 : Créer la base de données PostgreSQL

1. **Aller sur Render** : https://dashboard.render.com

2. **Cliquer sur "New +" → "PostgreSQL"**

3. **Configurer la base de données** :
   - **Name** : `decidoo-db`
   - **Database** : `decidoo` (ou laissez par défaut)
   - **User** : `decidoo` (ou laissez par défaut)
   - **Region** : **Frankfurt** (Europe)
   - **Plan** :
     - **Free** (0€, mais supprimé après 90 jours d'inactivité)
     - OU **Starter** (7$/mois, recommandé pour la production)

4. **Créer** : Cliquer sur "Create Database"

5. **Attendre** : La création prend 2-3 minutes

6. **Copier l'URL de connexion** :
   - Une fois créée, aller dans l'onglet "Connect"
   - Copier l'URL **"Internal Database URL"** (commence par `postgresql://...`)
   - **⚠️ IMPORTANT** : Gardez cette URL confidentielle !

---

## 🌐 Étape 3 : Créer l'application web Next.js

1. **Cliquer sur "New +" → "Web Service"**

2. **Connecter votre repository GitHub** :
   - Autoriser Render à accéder à votre compte GitHub
   - Sélectionner le repository `decidoo`

3. **Configurer le service** :
   - **Name** : `decidoo-app`
   - **Region** : **Frankfurt**
   - **Branch** : `main` (ou la branche que vous avez créée)
   - **Root Directory** : (laisser vide)
   - **Runtime** : **Node**
   - **Build Command** :
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command** :
     ```bash
     npm start
     ```
   - **Plan** : **Free** (0€, limité à 750h/mois - suffisant pour tester)

4. **NE PAS CLIQUER sur "Create Web Service" encore !**

---

## 🔐 Étape 4 : Configurer les variables d'environnement

Toujours sur la page de création du Web Service, descendre jusqu'à **"Environment Variables"** :

### Variables à ajouter :

| Nom | Valeur | Comment l'obtenir |
|-----|--------|-------------------|
| `NODE_ENV` | `production` | Valeur fixe |
| `DATABASE_URL` | `postgresql://...` | URL copiée à l'étape 2 (Internal Database URL) |
| `NEXTAUTH_URL` | `https://decidoo-app.onrender.com` | Sera votre URL finale (remplacez `decidoo-app` par le nom choisi) |
| `NEXTAUTH_SECRET` | (cliquer sur "Generate") | Laisser Render générer automatiquement |
| `CRON_SECRET` | (cliquer sur "Generate") | Laisser Render générer automatiquement |
| `FROM_EMAIL` | `noreply@decidoo.fr` | Email d'envoi (changez si vous avez votre domaine) |
| `RESEND_API_KEY` | `re_xxx...` | ⚠️ Optionnel : API key de Resend (voir étape 4.1) |

### 4.1 Obtenir une clé API Resend (optionnel mais recommandé)

Pour envoyer des vrais emails :

1. Créer un compte sur https://resend.com (gratuit, 100 emails/jour)
2. Aller dans "API Keys"
3. Créer une nouvelle clé
4. Copier la clé `re_xxxxx...`
5. L'ajouter dans `RESEND_API_KEY`

**Sans Resend** : Les emails seront affichés dans les logs uniquement (mode développement).

---

## 🚀 Étape 5 : Déployer l'application

1. **Cliquer sur "Create Web Service"**

2. **Attendre le déploiement** :
   - Render va cloner votre repo
   - Installer les dépendances
   - Générer Prisma Client
   - Builder Next.js
   - Démarrer l'application
   - **Durée** : 5-10 minutes

3. **Vérifier les logs** :
   - Regarder l'onglet "Logs" pour suivre l'avancement
   - Si tout va bien, vous verrez : `✓ Ready in XXms`

4. **Tester l'application** :
   - Cliquer sur l'URL fournie (ex: `https://decidoo-app.onrender.com`)
   - Vous devriez voir la page d'accueil

---

## 🗃️ Étape 6 : Initialiser la base de données

Votre base PostgreSQL est vide. Il faut créer les tables.

### 6.1 Via le Shell Render (recommandé)

1. **Aller dans votre Web Service** → onglet "Shell"

2. **Exécuter les migrations Prisma** :
   ```bash
   npx prisma migrate deploy
   ```

3. **Si vous n'avez pas encore de migrations** :
   ```bash
   # Créer une migration initiale
   npx prisma migrate dev --name init
   ```

### 6.2 Ou via votre machine locale

```bash
# Définir l'URL de la base Render
export DATABASE_URL="postgresql://..." # URL copiée à l'étape 2

# Pousser le schema
npx prisma db push

# Ou créer une migration
npx prisma migrate deploy
```

### 6.3 Vérifier que les tables sont créées

```bash
# Dans le shell Render
npx prisma studio
```

Ou aller sur le dashboard PostgreSQL de Render → onglet "Explore" pour voir les tables.

---

## ⏰ Étape 7 : Créer les cron jobs

Maintenant que l'app fonctionne, ajoutons les cron jobs automatiques.

### 7.1 Cron Job 1 : Fermer les décisions expirées

1. **Cliquer sur "New +" → "Cron Job"**

2. **Configurer** :
   - **Name** : `decidoo-cron-close-expired`
   - **Region** : **Frankfurt**
   - **Repository** : Même repo que l'app
   - **Branch** : `main`
   - **Build Command** : `npm install`
   - **Start Command** : `node scripts/cron-close-expired.js`
   - **Schedule** : `0 * * * *` (toutes les heures)
   - **Plan** : **Free**

3. **Variables d'environnement** :

| Nom | Valeur |
|-----|--------|
| `APP_URL` | `https://decidoo-app.onrender.com` (URL de votre app) |
| `CRON_SECRET` | (copier depuis votre Web Service) |

4. **Créer le cron job**

### 7.2 Cron Job 2 : Envoyer des rappels

1. **Cliquer sur "New +" → "Cron Job"**

2. **Configurer** :
   - **Name** : `decidoo-cron-reminders`
   - **Region** : **Frankfurt**
   - **Build Command** : `npm install`
   - **Start Command** : `node scripts/cron-send-reminders.js`
   - **Schedule** : `0 9 * * *` (tous les jours à 9h UTC = 10h FR hiver / 11h FR été)
   - **Plan** : **Free**

3. **Variables d'environnement** :

| Nom | Valeur |
|-----|--------|
| `DATABASE_URL` | (même URL que l'app) |
| `RESEND_API_KEY` | (même clé que l'app) |
| `FROM_EMAIL` | `noreply@decidoo.fr` |
| `APP_URL` | `https://decidoo-app.onrender.com` |

4. **Créer le cron job**

### 7.3 Cron Job 3 : Nettoyer les tokens expirés

1. **Cliquer sur "New +" → "Cron Job"**

2. **Configurer** :
   - **Name** : `decidoo-cron-cleanup`
   - **Region** : **Frankfurt**
   - **Build Command** : `npm install`
   - **Start Command** : `node scripts/cron-cleanup-tokens.js`
   - **Schedule** : `0 2 * * *` (tous les jours à 2h du matin UTC)
   - **Plan** : **Free**

3. **Variables d'environnement** :

| Nom | Valeur |
|-----|--------|
| `DATABASE_URL` | (même URL que l'app) |

4. **Créer le cron job**

### 7.4 Cron Job 4 : Vérifier les stades CONSENT

1. **Cliquer sur "New +" → "Cron Job"**

2. **Configurer** :
   - **Name** : `decidoo-cron-consent-stages`
   - **Region** : **Frankfurt**
   - **Build Command** : `npm install`
   - **Start Command** : `node scripts/cron-check-consent-stages.js`
   - **Schedule** : `*/15 * * * *` (toutes les 15 minutes)
   - **Plan** : **Free**

3. **Variables d'environnement** :

| Nom | Valeur |
|-----|--------|
| `APP_URL` | `https://decidoo-app.onrender.com` (URL de votre app) |
| `CRON_SECRET` | (copier depuis votre Web Service) |

4. **Créer le cron job**

**Note importante** : Ce cron job est **essentiel** pour les décisions par consentement. Il gère :
- Les transitions automatiques entre stades (Questions → Avis → Amendements → Objections)
- Les notifications email aux participants lors des changements de stade
- La fermeture automatique si tous les participants consentent

---

## 🧪 Étape 8 : Tester l'installation

### 8.1 Vérifier le health check

Aller sur : `https://decidoo-app.onrender.com/api/health`

Vous devriez voir :
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T...",
  "database": "connected"
}
```

### 8.2 Créer un compte utilisateur

1. Aller sur : `https://decidoo-app.onrender.com/auth/signup`
2. Créer un compte
3. Se connecter

### 8.3 Créer une organisation de test

1. Créer une organisation
2. Créer une décision avec une deadline dans 1h
3. Attendre 1h et vérifier que le cron job la ferme automatiquement

### 8.4 Vérifier les logs des cron jobs

1. Aller dans chaque cron job sur Render
2. Onglet "Logs"
3. Vérifier qu'ils s'exécutent sans erreur

---

## 📊 Étape 9 : Monitoring et maintenance

### 9.1 Dashboard Render

Vous pouvez monitorer :
- **Web Service** : CPU, RAM, requêtes HTTP
- **PostgreSQL** : Taille de la DB, connexions actives
- **Cron Jobs** : Dernière exécution, logs, erreurs

### 9.2 Logs en temps réel

Pour suivre les logs de l'application :
```bash
# Via l'interface Render
Dashboard → decidoo-app → Logs (onglet)

# Ou via CLI (si installé)
render logs -s decidoo-app
```

### 9.3 Alertes

Render envoie des emails automatiquement si :
- Le service crash
- La base de données est pleine
- Un cron job échoue

---

## 💰 Coûts estimés

| Service | Plan | Coût |
|---------|------|------|
| **Web Service** | Free | 0€ (750h/mois) |
| **PostgreSQL** | Free | 0€ (90 jours inactivité = suppression) |
| **PostgreSQL** | Starter | 7$/mois (~6,50€) |
| **Cron Jobs (x4)** | Free | 0€ (750h/mois partagées) |
| **Resend** | Free | 0€ (100 emails/jour) |

**Total pour tester** : 0€/mois (version gratuite complète)
**Total pour production** : ~7€/mois (PostgreSQL Starter recommandé)

---

## 🔧 Dépannage

### Problème : "Error: P1001 Can't reach database server"

**Solution** : Vérifier que `DATABASE_URL` est correcte et que la base est bien créée.

### Problème : "Module not found: @prisma/client"

**Solution** : Ajouter `npx prisma generate` dans le Build Command.

### Problème : "NEXTAUTH_URL is not defined"

**Solution** : Vérifier que `NEXTAUTH_URL` est bien définie dans les variables d'environnement.

### Problème : Le cron job ne s'exécute pas

**Solution** :
1. Vérifier les logs du cron job
2. Vérifier que `CRON_SECRET` est identique entre l'app et le cron
3. Vérifier que `APP_URL` pointe bien vers l'app

### Problème : "Build failed"

**Solution** : Regarder les logs détaillés et vérifier :
- Que toutes les dépendances sont dans `package.json`
- Que le build local fonctionne : `npm run build`

---

## 🎉 Félicitations !

Votre application Decidoo est maintenant déployée sur Render avec :
- ✅ Application Next.js en production
- ✅ Base de données PostgreSQL
- ✅ 4 cron jobs automatiques
- ✅ HTTPS activé par défaut
- ✅ Emails fonctionnels (si Resend configuré)

**Prochaines étapes** :
1. Configurer un nom de domaine personnalisé (optionnel)
2. Passer au plan Starter PostgreSQL pour la production
3. Monitorer l'utilisation et optimiser si nécessaire

---

## 📚 Ressources utiles

- Documentation Render : https://render.com/docs
- Documentation Prisma : https://www.prisma.io/docs
- Documentation Next.js : https://nextjs.org/docs
- Support Render : https://render.com/support

Si vous avez des questions, consultez les logs ou contactez le support Render (très réactif).
