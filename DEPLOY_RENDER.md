# Déploiement de Decidoo sur Render.com

Ce guide décrit comment déployer l'application Decidoo sur Render.com avec PostgreSQL et des tâches cron automatisées.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Render.com                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐          ┌──────────────────┐        │
│  │   Web Service   │──────────│   PostgreSQL     │        │
│  │   (Next.js)     │          │    Database      │        │
│  │                 │          │                  │        │
│  │  Port: 10000    │          │  decidoo-db      │        │
│  │  Health: /api/  │          │                  │        │
│  │         health  │          │                  │        │
│  └─────────────────┘          └──────────────────┘        │
│         ▲                                                   │
│         │                                                   │
│         │ Appelle les endpoints API                        │
│         │                                                   │
│  ┌──────┴──────────────────────────────────────────────┐  │
│  │             Cron Jobs (4 tâches)                    │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ 1. close-expired-decisions    (toutes les heures)   │  │
│  │ 2. send-deadline-reminders    (quotidien à 9h UTC)  │  │
│  │ 3. cleanup-expired-tokens     (quotidien à 2h UTC)  │  │
│  │ 4. check-consent-stages       (toutes les 15 min)   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Étapes de déploiement

### 1. Créer un compte Render

1. Allez sur [render.com](https://render.com)
2. Créez un compte (gratuit pour commencer)
3. Connectez votre compte GitHub

### 2. Créer un Blueprint depuis GitHub

1. Dans le dashboard Render, cliquez sur **"New +"** → **"Blueprint"**
2. Connectez votre repository GitHub `martwerlen/decido`
3. Sélectionnez la branche `claude/find-web-hosting-01H9DPrwURLMLBCfbSD4yWxX`
4. Render détectera automatiquement le fichier `render.yaml`

### 3. Configurer les variables d'environnement

Render générera automatiquement certaines variables, mais vous devez en configurer manuellement :

**À configurer manuellement :**

| Variable | Valeur | Description |
|----------|--------|-------------|
| `NEXTAUTH_URL` | `https://decidoo.onrender.com` | URL de votre application (sera fournie après création) |
| `RESEND_API_KEY` | Votre clé API Resend | Pour l'envoi d'emails (optionnel en dev) |

**Générées automatiquement :**
- `DATABASE_URL` → Connectée à `decidoo-db`
- `NEXTAUTH_SECRET` → Générée par Render (secret aléatoire)
- `CRON_SECRET` → Générée par Render (secret aléatoire)

### 4. Déployer le Blueprint

1. Cliquez sur **"Apply"** pour créer tous les services
2. Render créera automatiquement :
   - 1 Web Service (`decidoo`)
   - 1 PostgreSQL Database (`decidoo-db`)
   - 4 Cron Jobs
3. Le premier déploiement prendra ~5-10 minutes

### 5. Vérifier le déploiement

Une fois le déploiement terminé :

1. **Health check** : Visitez `https://decidoo.onrender.com/api/health`
   - Devrait retourner `{"status":"ok","database":"connected"}`

2. **Logs du web service** :
   ```
   ✓ Starting...
   ✓ Ready on http://0.0.0.0:10000
   ```

3. **Logs des cron jobs** : Vérifiez qu'ils s'exécutent aux horaires prévus

### 6. Initialiser la base de données

Après le premier déploiement, initialisez le schéma Prisma :

```bash
# Via le Shell de Render (Web Service → Shell)
npx prisma db push
```

Ou utilisez Prisma Migrate si vous avez des migrations :

```bash
npx prisma migrate deploy
```

### 7. Mettre à jour NEXTAUTH_URL

1. Notez l'URL finale de votre application (ex: `https://decidoo.onrender.com`)
2. Allez dans **Web Service → Environment**
3. Modifiez `NEXTAUTH_URL` avec l'URL complète
4. Redémarrez le service

### 8. Tester l'application

1. Visitez votre application : `https://decidoo.onrender.com`
2. Créez un compte utilisateur
3. Créez une organisation
4. Créez une décision de test
5. Vérifiez que les emails sont envoyés (si `RESEND_API_KEY` configurée)

### 9. Vérifier les cron jobs

Consultez les logs de chaque cron job pour vérifier leur bon fonctionnement :

1. **close-expired-decisions** (toutes les heures)
   - Log attendu : `✅ Cron terminé: X/Y décision(s) fermée(s)`

2. **send-deadline-reminders** (quotidien à 9h UTC)
   - Log attendu : `✅ X reminder(s) sent`

3. **cleanup-expired-tokens** (quotidien à 2h UTC)
   - Log attendu : `✅ Cleanup completed: X invitations, Y tokens, Z logs deleted`

4. **check-consent-stages** (toutes les 15 minutes)
   - Log attendu : `✅ X décision(s) CONSENT mise(s) à jour`

## Scripts Cron

### 1. `scripts/cron-close-expired.js`

**Fréquence** : Toutes les heures (`0 * * * *`)

**Fonction** : Ferme automatiquement les décisions dont la deadline est passée

**Endpoint** : `POST /api/cron/close-expired-decisions`

**Sécurité** : Authentification via `Authorization: Bearer ${CRON_SECRET}`

### 2. `scripts/cron-send-reminders.js`

**Fréquence** : Quotidien à 9h UTC (`0 9 * * *`)

**Fonction** : Envoie des emails de rappel 24h avant la deadline

**Logique** :
- Trouve toutes les décisions OPEN avec deadline dans 24h
- Pour chaque participant qui n'a pas encore voté
- Envoie un email de rappel

### 3. `scripts/cron-cleanup-tokens.js`

**Fréquence** : Quotidien à 2h UTC (`0 2 * * *`)

**Fonction** : Nettoie les données expirées

**Supprime** :
- Invitations expirées (> 7 jours)
- Tokens de vote externes expirés
- Logs de votes anonymes de décisions fermées

### 4. `scripts/cron-check-consent-stages.js`

**Fréquence** : Toutes les 15 minutes (`*/15 * * * *`)

**Fonction** : Gère la progression des étapes des décisions CONSENT

**Logique** :
- Trouve toutes les décisions CONSENT actives
- Calcule l'étape actuelle selon les timings
- Met à jour `consentCurrentStage` si changement
- Gère les transitions : CLARIFICATIONS → AVIS → AMENDEMENTS → OBJECTIONS → TERMINEE

## Coûts estimés (Render)

| Service | Plan | Coût mensuel |
|---------|------|--------------|
| Web Service | Starter | $7/mois |
| PostgreSQL | Starter | $7/mois |
| Cron Jobs (4×) | Gratuit | $0 |
| **Total** | | **$14/mois** |

**Plan gratuit** : Render offre 750h gratuites/mois pour les Web Services (suffisant pour tester)

## Dépannage

### Erreur : "Cannot find module 'tailwindcss'"

**Solution** : Le build command doit utiliser `npm install --production=false`

```yaml
buildCommand: npm install --production=false && npx prisma generate && npm run build
```

### Erreur : "Health check failed"

**Causes possibles** :
1. Base de données non initialisée → Exécutez `npx prisma db push`
2. `DATABASE_URL` mal configurée → Vérifiez les variables d'environnement
3. Schéma Prisma non généré → Ajoutez `npx prisma generate` au build command

### Erreur : Cron job échoue avec 401 Unauthorized

**Solution** : Vérifiez que `CRON_SECRET` est bien partagée entre le Web Service et les Cron Jobs

### Erreur : Emails non envoyés

**Causes possibles** :
1. `RESEND_API_KEY` manquante ou invalide
2. `FROM_EMAIL` non vérifiée dans Resend
3. Consultez les logs du Web Service pour voir les erreurs Resend

### Décisions CONSENT ne progressent pas

**Solution** : Vérifiez les logs du cron job `check-consent-stages`

```bash
# Devrait s'exécuter toutes les 15 minutes
⏰ [timestamp] Début de la vérification des étapes CONSENT
✅ X décision(s) CONSENT mise(s) à jour
```

## Mise à jour de l'application

Render redéploie automatiquement l'application à chaque push sur la branche configurée.

**Pour forcer un redéploiement** :
1. Allez dans **Web Service → Manual Deploy**
2. Cliquez sur **"Deploy latest commit"**

## Surveillance

**Health Check** : Render vérifie automatiquement `/api/health` toutes les 5 minutes

**Logs** : Accessibles dans chaque service → **"Logs"**

**Metrics** : Accessibles dans chaque service → **"Metrics"** (CPU, RAM, requests)

## Migration depuis SQLite

Le schéma Prisma a été mis à jour pour utiliser PostgreSQL au lieu de SQLite :

```prisma
datasource db {
  provider = "postgresql"  // était "sqlite"
  url      = env("DATABASE_URL")
}
```

**Données de développement** : Non migrées automatiquement. Vous devrez recréer des données de test en production.

## Support

**Render Documentation** : https://render.com/docs

**Render Community** : https://community.render.com

**Decidoo Issues** : https://github.com/martwerlen/decido/issues
