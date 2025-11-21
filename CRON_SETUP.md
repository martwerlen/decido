# Configuration du Cron Job pour la Vérification Automatique des Dates Limites

Ce document explique comment configurer un système de vérification automatique des dates limites des décisions.

## Vue d'ensemble

L'application dispose d'un endpoint API `/api/cron/check-deadlines` qui :
- Récupère toutes les décisions avec `status='OPEN'` et dont la date limite (`endDate`) est dépassée
- Ferme automatiquement ces décisions avec le statut et résultat appropriés selon le type de décision
- Stocke les métadonnées de fermeture (raison, date, participation)
- Logue l'événement dans l'historique de la décision

## Sécurité

L'endpoint est protégé par un token d'autorisation pour éviter les appels non autorisés.

**Configuration requise :**

1. Ajouter une variable d'environnement `CRON_SECRET` dans votre fichier `.env` :

```bash
# Secret pour sécuriser l'endpoint cron
CRON_SECRET="votre-token-secret-aleatoire-ici"
```

Pour générer un token sécurisé :
```bash
openssl rand -base64 32
```

2. Le cron job doit passer ce token dans l'en-tête `Authorization` :
```bash
Authorization: Bearer votre-token-secret-aleatoire-ici
```

## Options de Configuration

Vous avez plusieurs options pour configurer l'appel régulier de cet endpoint :

### Option 1 : Cron Job Linux/Unix (Recommandé pour VPS)

Si votre application est hébergée sur un serveur Linux/Unix, utilisez `crontab` :

1. Ouvrez l'éditeur crontab :
```bash
crontab -e
```

2. Ajoutez une ligne pour exécuter le job toutes les 15 minutes :
```bash
# Vérifier les décisions expirées toutes les 15 minutes
*/15 * * * * curl -X GET -H "Authorization: Bearer VOTRE_TOKEN_SECRET" https://votre-domaine.com/api/cron/check-deadlines
```

3. Ou toutes les heures :
```bash
# Vérifier les décisions expirées toutes les heures
0 * * * * curl -X GET -H "Authorization: Bearer VOTRE_TOKEN_SECRET" https://votre-domaine.com/api/cron/check-deadlines
```

**Conseil :** Remplacez `VOTRE_TOKEN_SECRET` par la valeur de votre variable `CRON_SECRET`.

### Option 2 : Systemd Timer (Linux)

Pour une approche plus moderne sur les systèmes Linux avec systemd :

1. Créez un fichier de service `/etc/systemd/system/decidoo-check-deadlines.service` :
```ini
[Unit]
Description=Decidoo - Check Decision Deadlines
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -X GET -H "Authorization: Bearer VOTRE_TOKEN_SECRET" https://votre-domaine.com/api/cron/check-deadlines
```

2. Créez un fichier de timer `/etc/systemd/system/decidoo-check-deadlines.timer` :
```ini
[Unit]
Description=Decidoo - Check Decision Deadlines Timer
Requires=decidoo-check-deadlines.service

[Timer]
# Exécuter toutes les 15 minutes
OnCalendar=*:0/15
Persistent=true

[Install]
WantedBy=timers.target
```

3. Activez et démarrez le timer :
```bash
sudo systemctl daemon-reload
sudo systemctl enable decidoo-check-deadlines.timer
sudo systemctl start decidoo-check-deadlines.timer

# Vérifier le statut
sudo systemctl status decidoo-check-deadlines.timer
```

### Option 3 : Node.js Cron (node-cron)

Si vous préférez gérer le cron directement dans votre application Node.js :

1. Installez `node-cron` :
```bash
npm install node-cron
```

2. Créez un fichier `lib/cron-jobs.ts` :
```typescript
import cron from 'node-cron';

export function startCronJobs() {
  // Exécuter toutes les 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('[CRON] Checking decision deadlines...');

      const response = await fetch(\`\${process.env.NEXTAUTH_URL}/api/cron/check-deadlines\`, {
        method: 'GET',
        headers: {
          'Authorization': \`Bearer \${process.env.CRON_SECRET}\`,
        },
      });

      const result = await response.json();
      console.log('[CRON] Result:', result);
    } catch (error) {
      console.error('[CRON] Error checking deadlines:', error);
    }
  });

  console.log('[CRON] Jobs started');
}
```

3. Appelez cette fonction au démarrage de l'application (dans `server.ts` ou équivalent) :
```typescript
import { startCronJobs } from './lib/cron-jobs';

// Au démarrage
startCronJobs();
```

**⚠️ Note :** Cette approche n'est recommandée que si vous avez un seul serveur. Pour des déploiements multi-instances (comme Vercel), utilisez une solution externe.

### Option 4 : Vercel Cron Jobs

Si vous utilisez Vercel pour l'hébergement :

1. Créez un fichier `vercel.json` à la racine du projet :
```json
{
  "crons": [
    {
      "path": "/api/cron/check-deadlines",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

2. Vercel appellera automatiquement cet endpoint avec un en-tête `Authorization` spécial.

3. Modifiez l'endpoint `/api/cron/check-deadlines/route.ts` pour accepter également l'en-tête de Vercel :
```typescript
const authHeader = request.headers.get('authorization');
const vercelCronHeader = request.headers.get('x-vercel-cron-secret');
const token = authHeader?.replace('Bearer ', '');
const cronSecret = process.env.CRON_SECRET;

// Accepter soit le token Bearer, soit l'en-tête Vercel
if (cronSecret && token !== cronSecret && vercelCronHeader !== cronSecret) {
  return Response.json(
    { error: 'Unauthorized - Invalid or missing token' },
    { status: 401 }
  );
}
```

**Documentation Vercel :** https://vercel.com/docs/cron-jobs

### Option 5 : Service Externe (cron-job.org, EasyCron, etc.)

Vous pouvez également utiliser un service de cron externe gratuit :

**cron-job.org (Gratuit) :**
1. Créez un compte sur https://cron-job.org
2. Créez un nouveau cron job :
   - URL : `https://votre-domaine.com/api/cron/check-deadlines`
   - Méthode : GET
   - Fréquence : Toutes les 15 minutes
   - Headers : `Authorization: Bearer VOTRE_TOKEN_SECRET`

**EasyCron (Gratuit avec limitations) :**
1. Créez un compte sur https://www.easycron.com
2. Configurez un nouveau job avec les mêmes paramètres

## Fréquence Recommandée

La fréquence recommandée dépend de vos besoins :

- **Haute précision** (±5 minutes) : Exécuter toutes les 5 minutes → `*/5 * * * *`
- **Précision normale** (±15 minutes) : Exécuter toutes les 15 minutes → `*/15 * * * *` ✅ **Recommandé**
- **Faible charge** (±30 minutes) : Exécuter toutes les 30 minutes → `*/30 * * * *`
- **Très faible charge** (±1 heure) : Exécuter toutes les heures → `0 * * * *`

## Vérification du Fonctionnement

Pour tester manuellement l'endpoint :

```bash
curl -X GET \
  -H "Authorization: Bearer VOTRE_TOKEN_SECRET" \
  https://votre-domaine.com/api/cron/check-deadlines
```

Réponse attendue :
```json
{
  "success": true,
  "timestamp": "2025-01-19T10:30:00.000Z",
  "total": 5,
  "closed": 4,
  "skipped": 1,
  "errors": []
}
```

Où :
- `total` : Nombre total de décisions expirées trouvées
- `closed` : Nombre de décisions fermées avec succès
- `skipped` : Nombre de décisions ignorées (ex: ADVICE_SOLICITATION)
- `errors` : Liste des erreurs rencontrées

## Surveillance et Logs

Pour surveiller le bon fonctionnement du cron job :

1. **Logs serveur** : Les événements de fermeture sont loggés dans `DecisionLog`
2. **Logs cron** : Consultez les logs de votre système cron (selon la méthode choisie)
3. **Monitoring** : Configurez des alertes si le endpoint retourne des erreurs

## Dépannage

**Le cron ne s'exécute pas :**
- Vérifiez que la syntaxe cron est correcte
- Vérifiez que le serveur/service cron est actif
- Vérifiez les logs du système cron

**Erreur 401 Unauthorized :**
- Vérifiez que `CRON_SECRET` est correctement configuré dans `.env`
- Vérifiez que le token dans l'en-tête `Authorization` correspond

**Aucune décision fermée :**
- Normal si aucune décision n'a dépassé sa date limite
- Vérifiez manuellement s'il y a des décisions OPEN avec `endDate` < maintenant

**Erreurs 500 :**
- Consultez les logs de l'application
- Vérifiez la connexion à la base de données
- Vérifiez que Prisma est correctement configuré

## Résumé

La méthode recommandée dépend de votre environnement :

- **Vercel** → Option 4 (Vercel Cron Jobs)
- **VPS/Serveur dédié** → Option 1 (Cron Linux) ou Option 2 (Systemd Timer)
- **Serveur mutualisé** → Option 5 (Service externe)
- **Développement local** → Option 3 (node-cron)

Assurez-vous toujours que :
1. ✅ `CRON_SECRET` est configuré dans `.env`
2. ✅ Le cron passe le token dans `Authorization: Bearer XXX`
3. ✅ La fréquence est adaptée à vos besoins (recommandé : 15 minutes)
