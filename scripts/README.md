# Scripts Cron pour Decidoo

Ce dossier contient les scripts exécutés automatiquement par les cron jobs Render.

## 📜 Scripts disponibles

### 1. `cron-close-expired.js`

**Fréquence** : Toutes les heures (`0 * * * *`)

**Fonction** : Ferme automatiquement les décisions dont la deadline est passée.

**Fonctionnement** :
- Appelle l'API `/api/cron/close-expired-decisions`
- Authentifié via `Bearer ${CRON_SECRET}`
- Met à jour le statut de `OPEN` à `CLOSED`
- Logue l'événement dans `DecisionLog`

**Variables requises** :
- `APP_URL` : URL de l'application (ex: `https://decidoo-app.onrender.com`)
- `CRON_SECRET` : Secret partagé pour l'authentification

**Logs** :
```
⏰ [2025-11-19T10:00:00.000Z] Début du cron: fermeture des décisions expirées
✅ Succès: 3 décision(s) fermée(s)
```

---

### 2. `cron-send-reminders.js`

**Fréquence** : Tous les jours à 9h UTC (`0 9 * * *`)

**Fonction** : Envoie des emails de rappel aux participants qui n'ont pas encore voté pour les décisions se terminant dans les 24h.

**Fonctionnement** :
- Cherche les décisions OPEN avec `endDate` entre maintenant et +24h
- Filtre les participants qui n'ont pas voté (`hasVoted = false`)
- Envoie un email via Resend à chaque participant
- Mode simulation si `RESEND_API_KEY` non configuré (affiche dans les logs)

**Variables requises** :
- `DATABASE_URL` : URL PostgreSQL
- `RESEND_API_KEY` : Clé API Resend (optionnel, simulation sinon)
- `FROM_EMAIL` : Email d'envoi (ex: `noreply@decidoo.fr`)
- `APP_URL` : URL de l'application

**Template email** :
```
⏰ Rappel : Votre vote est attendu

Bonjour [Nom],

La décision "[Titre]" se termine dans [X]h et vous n'avez pas encore voté.

[Bouton: Voter maintenant]
```

**Logs** :
```
⏰ [2025-11-19T09:00:00.000Z] Début du cron: envoi des rappels
📧 2 décision(s) nécessitent des rappels
✅ Email envoyé à user@example.com pour "Décision importante"
✅ Cron terminé: 5 email(s) envoyé(s)
```

---

### 3. `cron-cleanup-tokens.js`

**Fréquence** : Tous les jours à 2h UTC (`0 2 * * *`)

**Fonction** : Nettoie les données temporaires et expirées pour optimiser la base de données.

**Fonctionnement** :
1. **Invitations** :
   - Marque comme `EXPIRED` les invitations `PENDING` de plus de 7 jours
   - Supprime les invitations `EXPIRED` ou `CANCELLED` de plus de 30 jours

2. **Tokens de vote externe** :
   - Supprime les tokens des participants externes dont la décision est terminée et le token expiré

3. **Logs de vote anonyme** :
   - Supprime les `AnonymousVoteLog` de plus de 90 jours (RGPD)

**Variables requises** :
- `DATABASE_URL` : URL PostgreSQL

**Logs** :
```
⏰ [2025-11-19T02:00:00.000Z] Début du cron: nettoyage des tokens
🗑️ 12 invitation(s) expirée(s) supprimée(s)
⏰ 5 invitation(s) marquée(s) comme expirée(s)
🔒 8 token(s) de participant externe supprimé(s)
🧹 150 log(s) de vote anonyme supprimé(s)

📊 Statistiques après nettoyage:
   - Invitations PENDING: 3
   - Tokens de vote actifs: 12
   - Logs anonymes (total): 450

✅ Cron de nettoyage terminé avec succès
```

---

## 🧪 Tester les scripts localement

### Prérequis

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos valeurs
```

### Tester cron-close-expired.js

```bash
# Définir les variables
export APP_URL="http://localhost:3000"
export CRON_SECRET="votre-secret-local"

# Lancer le script
node scripts/cron-close-expired.js
```

### Tester cron-send-reminders.js

```bash
# Définir les variables
export DATABASE_URL="file:./prisma/dev.db"  # SQLite local
export RESEND_API_KEY=""  # Laisser vide pour simulation
export FROM_EMAIL="noreply@decidoo.fr"
export APP_URL="http://localhost:3000"

# Lancer le script
node scripts/cron-send-reminders.js
```

### Tester cron-cleanup-tokens.js

```bash
# Définir les variables
export DATABASE_URL="file:./prisma/dev.db"

# Lancer le script
node scripts/cron-cleanup-tokens.js
```

---

## 🔐 Sécurité

### CRON_SECRET

Le `CRON_SECRET` est un token partagé entre :
- L'application web (qui vérifie le Bearer token dans `/api/cron/*`)
- Les scripts cron (qui envoient le Bearer token)

**Générer un secret** :
```bash
# Avec OpenSSL
openssl rand -base64 32

# Avec Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**IMPORTANT** : Ne jamais commiter le `CRON_SECRET` dans le code !

### Protection des endpoints API

Tous les endpoints `/api/cron/*` vérifient :
```typescript
const authHeader = request.headers.get("authorization")
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

Sans ce header, l'accès est refusé.

---

## 📊 Monitoring

### Vérifier les logs sur Render

1. Aller sur https://dashboard.render.com
2. Sélectionner le cron job
3. Onglet "Logs"
4. Filtrer par date/heure

### Alertes

Render envoie un email automatique si :
- Le script se termine avec `exit(1)` (erreur)
- Le script timeout (> 15 minutes par défaut)

---

## 🛠️ Dépannage

### Problème : "Variables manquantes"

**Erreur** :
```
❌ Variables manquantes: APP_URL et CRON_SECRET sont requis
```

**Solution** : Vérifier que toutes les variables sont définies dans le cron job Render.

### Problème : "Error HTTP 401"

**Erreur** :
```
❌ Erreur HTTP 401: {"error":"Unauthorized"}
```

**Solution** : Le `CRON_SECRET` ne correspond pas entre l'app web et le cron. Vérifier qu'ils sont identiques.

### Problème : "Can't reach database server"

**Erreur** :
```
❌ Erreur Prisma: Can't reach database server at ...
```

**Solution** :
1. Vérifier que `DATABASE_URL` est correcte
2. Vérifier que la base PostgreSQL est bien démarrée sur Render
3. Vérifier les connexions réseau (firewall, etc.)

### Problème : "Module not found: @prisma/client"

**Solution** : Ajouter `npx prisma generate` dans le Build Command du cron job.

---

## 📝 Maintenance

### Ajuster les fréquences

Pour changer la fréquence d'un cron job, éditer le champ "Schedule" sur Render :

| Fréquence souhaitée | Syntaxe cron |
|---------------------|--------------|
| Toutes les 30 min | `*/30 * * * *` |
| Toutes les 2h | `0 */2 * * *` |
| Tous les lundis à 8h | `0 8 * * 1` |
| 1er du mois à minuit | `0 0 1 * *` |

Syntaxe : `minute heure jour mois jour_semaine`

### Désactiver un cron job

Sur Render :
1. Aller dans le cron job
2. Onglet "Settings"
3. "Suspend Cron Job"

### Supprimer un cron job

**ATTENTION** : Suppression définitive !

1. Onglet "Settings"
2. "Delete Cron Job"
3. Confirmer

---

## 🔗 Ressources

- **Syntaxe cron** : https://crontab.guru
- **Render Cron Jobs** : https://render.com/docs/cronjobs
- **Prisma CLI** : https://www.prisma.io/docs/reference/api-reference/command-reference

---

## 📞 Support

Si un script ne fonctionne pas comme prévu :
1. Vérifier les logs sur Render
2. Tester le script localement
3. Vérifier les variables d'environnement
4. Consulter le guide de déploiement : `/DEPLOY_RENDER.md`
