# Guide de déploiement sur Railway

Ce guide vous accompagne pour déployer Decidoo sur Railway avec PostgreSQL.

## 📋 Prérequis

- Un compte GitHub avec votre repository Decidoo
- Un compte Railway (gratuit) : https://railway.app
- Un compte Resend pour les emails : https://resend.com

## 🚀 Étapes de déploiement

### 1. Créer un nouveau projet sur Railway

1. Connectez-vous à [Railway](https://railway.app)
2. Cliquez sur **"New Project"**
3. Sélectionnez **"Deploy from GitHub repo"**
4. Autorisez Railway à accéder à votre repository GitHub
5. Sélectionnez le repository `decidoo`

### 2. Ajouter une base de données PostgreSQL

1. Dans votre projet Railway, cliquez sur **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway va créer automatiquement une base PostgreSQL et générer la variable `DATABASE_URL`

### 3. Configurer les variables d'environnement

Dans Railway, allez dans l'onglet **"Variables"** de votre service et ajoutez :

#### Variables essentielles

```bash
# NextAuth (générez avec: openssl rand -base64 32)
NEXTAUTH_SECRET=VotreSecretAleatoireTresLong

# URL de votre application (Railway vous fournit un domaine)
# Exemple: https://decidoo-production.up.railway.app
NEXTAUTH_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# Email Resend (obtenez sur https://resend.com/api-keys)
RESEND_API_KEY=re_VotreCleAPI
FROM_EMAIL=noreply@votredomaine.fr

# Cron job (générez avec: openssl rand -hex 32)
CRON_SECRET=VotreSecretCronAleatoire
```

> ⚠️ **Important** : `DATABASE_URL` est automatiquement générée par Railway lorsque vous ajoutez PostgreSQL, ne la modifiez pas !

### 4. Configurer le build sur Railway

Railway détecte automatiquement Next.js, mais nous devons ajouter une étape de migration Prisma.

Dans l'onglet **"Settings"** de votre service :

1. **Build Command** :
   ```bash
   npm install && npx prisma generate && npx prisma migrate deploy && npm run build
   ```

2. **Start Command** (déjà détecté) :
   ```bash
   npm run start
   ```

### 5. Déployer

Railway va automatiquement déployer votre application dès que vous pushez sur la branche `main`.

1. Commitez et pushez vos changements :
   ```bash
   git add .
   git commit -m "Configure for Railway deployment"
   git push origin main
   ```

2. Railway détecte le push et lance le build automatiquement

3. Attendez que le déploiement se termine (3-5 minutes)

4. Railway vous fournit une URL publique : `https://votre-app.up.railway.app`

### 6. Initialiser la base de données (première fois)

**Option 1 : Via script de seed (recommandé)**

Si vous avez un script de seed dans `prisma/seed.ts` :

```bash
# Localement, connectez-vous à la base Railway
export DATABASE_URL="postgresql://..."  # Copiez depuis Railway
npx prisma db seed
```

**Option 2 : Créer manuellement le premier utilisateur**

Accédez à votre application déployée et créez un compte via `/auth/signup`

### 7. Configurer le domaine personnalisé (optionnel)

1. Dans Railway, allez dans **"Settings"** → **"Domains"**
2. Cliquez sur **"Custom Domain"**
3. Ajoutez votre domaine (ex: `decidoo.votredomaine.fr`)
4. Configurez le DNS chez votre registrar :
   - Type: `CNAME`
   - Name: `decidoo` (ou `@` pour domaine racine)
   - Value: Le domaine fourni par Railway

### 8. Configurer les cron jobs (4 tâches automatisées)

Decidoo utilise **4 cron jobs** pour automatiser la gestion des décisions :

| Cron Job | Endpoint | Fréquence | Description |
|----------|----------|-----------|-------------|
| **check-deadlines** | `/api/cron/check-deadlines` | Toutes les 15 min | Ferme les décisions expirées et calcule les résultats |
| **check-consent-stages** | `/api/cron/check-consent-stages` | Toutes les 15 min | Vérifie et avance les stages des décisions CONSENT |
| **send-reminders** | `/api/cron/send-reminders` | Quotidien à 9h UTC | Envoie des rappels aux participants avant deadline |
| **cleanup-tokens** | `/api/cron/cleanup-tokens` | Quotidien à 2h UTC | Nettoie les tokens et invitations expirés |

Railway ne propose pas de cron natif gratuit. Utilisez un service externe :

#### **Option 1 : GitHub Actions (recommandé, gratuit)**

Le workflow est **déjà configuré** dans `.github/workflows/check-deadlines.yml` ! Il suffit d'ajouter les secrets :

1. Dans votre repository GitHub, allez dans **Settings** → **Secrets and variables** → **Actions**
2. Cliquez sur **New repository secret** et ajoutez :

**CRON_SECRET**
```
VotreSecretCron (le même que dans Railway)
```

**RAILWAY_URL**
```
https://votre-app.up.railway.app
```

3. C'est tout ! Les 4 cron jobs s'exécuteront automatiquement selon leurs horaires

**Déclenchement manuel** : Vous pouvez aussi exécuter manuellement un cron job via l'onglet **Actions** → **Decidoo Cron Jobs** → **Run workflow**

#### **Option 2 : cron-job.org (alternatif, gratuit)**

1. Créez un compte sur [cron-job.org](https://cron-job.org)
2. Créez **4 nouveaux cron jobs** :

**Cron Job 1 : check-deadlines**
- **Title** : Decidoo - Check Deadlines
- **URL** : `https://votre-app.up.railway.app/api/cron/check-deadlines`
- **Schedule** : `*/15 * * * *` (toutes les 15 minutes)
- **Headers** : `Authorization: Bearer VotreSecretCron`

**Cron Job 2 : check-consent-stages**
- **Title** : Decidoo - Check Consent Stages
- **URL** : `https://votre-app.up.railway.app/api/cron/check-consent-stages`
- **Schedule** : `*/15 * * * *` (toutes les 15 minutes)
- **Headers** : `Authorization: Bearer VotreSecretCron`

**Cron Job 3 : send-reminders**
- **Title** : Decidoo - Send Reminders
- **URL** : `https://votre-app.up.railway.app/api/cron/send-reminders`
- **Schedule** : `0 9 * * *` (quotidien à 9h UTC)
- **Headers** : `Authorization: Bearer VotreSecretCron`

**Cron Job 4 : cleanup-tokens**
- **Title** : Decidoo - Cleanup Tokens
- **URL** : `https://votre-app.up.railway.app/api/cron/cleanup-tokens`
- **Schedule** : `0 2 * * *` (quotidien à 2h UTC)
- **Headers** : `Authorization: Bearer VotreSecretCron`

## 🔍 Vérifications post-déploiement

### 1. Test de connexion
- ✅ Accédez à votre URL Railway
- ✅ Créez un compte via `/auth/signup`
- ✅ Créez une organisation

### 2. Test de base de données
- ✅ Vérifiez que les données sont persistées (rechargez la page)
- ✅ Créez une décision de test

### 3. Test des emails
- ✅ Invitez un membre à votre organisation
- ✅ Vérifiez que l'email est envoyé (consultez les logs Railway si problème)

### 4. Test des cron jobs
- ✅ **check-deadlines** : Créez une décision avec deadline dans le passé, attendez 15 min, vérifiez qu'elle est fermée
- ✅ **send-reminders** : Créez une décision avec deadline dans 23h, attendez 9h UTC, vérifiez l'email de rappel
- ✅ **cleanup-tokens** : Vérifiez les logs à 2h UTC pour voir le nettoyage
- ✅ **check-consent-stages** : Créez une décision CONSENT, vérifiez le passage entre stages

## 📊 Monitoring et logs

### Accéder aux logs

Dans Railway, onglet **"Deployments"** :
- Cliquez sur le dernier déploiement
- Onglet **"Logs"** pour voir les logs en temps réel

### Logs utiles à surveiller

```bash
# Erreurs de base de données
Prisma

# Erreurs d'emails
Resend

# Erreurs de cron
check-deadlines
```

## 🔧 Résolution de problèmes courants

### Erreur : "Prisma Client not generated"

**Solution** :
Vérifiez que votre Build Command contient `npx prisma generate` :
```bash
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

### Erreur : "Can't reach database server"

**Solution** :
1. Vérifiez que le service PostgreSQL est démarré dans Railway
2. Vérifiez que `DATABASE_URL` est bien définie
3. Redéployez si nécessaire

### Emails non envoyés

**Solution** :
1. Vérifiez `RESEND_API_KEY` dans les variables
2. Vérifiez `FROM_EMAIL` (doit être un domaine vérifié sur Resend)
3. Consultez les logs Railway pour voir les erreurs

### Erreur 500 au démarrage

**Solution** :
1. Consultez les logs Railway
2. Vérifiez que toutes les variables d'environnement sont définies
3. Vérifiez que les migrations Prisma ont réussi

## 🔄 Mises à jour de l'application

Pour déployer une nouvelle version :

```bash
git add .
git commit -m "Description des changements"
git push origin main
```

Railway redéploie automatiquement !

### Migrations de base de données

Si vous modifiez le schéma Prisma :

```bash
# Créez la migration localement
npx prisma migrate dev --name description_du_changement

# Commitez et pushez
git add prisma/
git commit -m "Database migration: description_du_changement"
git push origin main
```

Railway exécutera automatiquement `prisma migrate deploy` lors du build.

## 💰 Coûts estimés

**Plan gratuit Railway** :
- $5 de crédit gratuit par mois
- Suffisant pour tester et petite utilisation
- Si dépassement : ~$0.000231/minute de runtime

**Mise à l'échelle** :
Quand vous dépassez le plan gratuit, passez au plan **Developer** ($20/mois) qui inclut :
- 100h de runtime
- 100GB de trafic sortant

## 📚 Ressources

- [Documentation Railway](https://docs.railway.app)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Resend](https://resend.com/docs)

## ✅ Checklist finale

- [ ] Projet Railway créé
- [ ] PostgreSQL ajouté
- [ ] Toutes les variables d'environnement configurées
- [ ] Build command configuré avec Prisma
- [ ] Application déployée avec succès
- [ ] Premier utilisateur créé
- [ ] Organisation de test créée
- [ ] Email de test envoyé
- [ ] Cron job configuré (cron-job.org ou GitHub Actions)
- [ ] Domaine personnalisé configuré (optionnel)

---

🎉 **Félicitations !** Votre application Decidoo est maintenant en production sur Railway !
