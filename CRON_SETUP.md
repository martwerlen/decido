# Configuration du Cron Job pour les décisions par consentement

Ce document explique comment configurer le cron job nécessaire pour gérer automatiquement les transitions de stade des décisions par consentement.

## Pourquoi un cron job ?

Les décisions par consentement comportent plusieurs stades temporels (Clarifications, Avis, Amendements, Objections) qui nécessitent des transitions automatiques et l'envoi de notifications aux participants. Un cron job vérifie périodiquement ces décisions et déclenche les actions nécessaires.

## Configuration

### 1. Générer un secret pour le cron

Générez un secret aléatoire sécurisé et ajoutez-le à votre fichier `.env` :

```bash
openssl rand -hex 32
```

Ajoutez la valeur générée dans votre `.env` :

```
CRON_SECRET="votre-secret-genere-ici"
```

### 2. Configurer le cron

Le cron job doit appeler l'endpoint `/api/cron/check-consent-stages` toutes les **15 minutes** (recommandé).

#### Option A : Cron Linux (VPS/Serveur dédié)

Éditez votre crontab :

```bash
crontab -e
```

Ajoutez cette ligne (remplacez les valeurs appropriées) :

```bash
*/15 * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/check-consent-stages >> /var/log/decidoo-cron.log 2>&1
```

#### Option B : cPanel / Plesk (Hébergement mutualisé)

1. Connectez-vous à votre panneau de contrôle (cPanel/Plesk)
2. Trouvez la section "Tâches Cron" ou "Cron Jobs"
3. Créez une nouvelle tâche avec les paramètres suivants :
   - **Intervalle** : */15 (toutes les 15 minutes)
   - **Commande** :
     ```bash
     curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/check-consent-stages
     ```

#### Option C : Service externe (EasyCron, cron-job.org)

Si votre hébergement ne supporte pas les cron jobs, vous pouvez utiliser un service externe gratuit :

**Avec [cron-job.org](https://cron-job.org)** :
1. Créez un compte gratuit
2. Créez un nouveau cron job avec :
   - **URL** : `https://yourdomain.com/api/cron/check-consent-stages`
   - **Schedule** : Every 15 minutes
   - **Headers** : Ajoutez `Authorization: Bearer YOUR_CRON_SECRET`

**Avec [EasyCron](https://www.easycron.com)** :
1. Créez un compte gratuit
2. Créez un nouveau cron job avec :
   - **URL** : `https://yourdomain.com/api/cron/check-consent-stages`
   - **Cron Expression** : `*/15 * * * *`
   - **Custom Headers** : `Authorization: Bearer YOUR_CRON_SECRET`

## Test manuel

Pour tester que votre cron fonctionne correctement, vous pouvez l'appeler manuellement :

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/check-consent-stages
```

Réponse attendue :

```json
{
  "success": true,
  "processedCount": 0,
  "notificationsCount": 0,
  "closedCount": 0,
  "totalDecisions": 0,
  "timestamp": "2025-11-12T21:30:00.000Z"
}
```

## Que fait le cron job ?

À chaque exécution (toutes les 15 minutes), le cron job :

1. **Vérifie les décisions CONSENT ouvertes** et calcule leur stade actuel
2. **Détecte les transitions de stade** (ex: CLARIFICATIONS → AVIS)
3. **Envoie des notifications email** aux participants concernés lors des transitions
4. **Clôture automatiquement les décisions** dont :
   - La deadline est atteinte
   - Tous les participants ont consenti (clôture anticipée)

## Fréquence recommandée

**15 minutes** est la fréquence recommandée car elle offre un bon équilibre entre :
- Réactivité acceptable pour les notifications
- Charge serveur raisonnable
- Coût minimal (si service externe payant)

Vous pouvez ajuster selon vos besoins :
- **5-10 minutes** : Plus réactif mais plus de charge
- **30 minutes** : Moins de charge mais moins réactif

## Sécurité

- ⚠️ **Ne partagez JAMAIS** votre `CRON_SECRET`
- ✅ Utilisez une valeur aléatoire longue (32+ caractères)
- ✅ L'endpoint vérifie systématiquement le token d'autorisation
- ✅ En cas de token invalide, l'endpoint retourne une erreur 401

## Logs et monitoring

Pour surveiller l'exécution du cron :

```bash
# Afficher les logs
tail -f /var/log/decidoo-cron.log

# Vérifier les dernières exécutions
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/check-consent-stages
```

Les logs du serveur Next.js affichent également les détails :
- `📊 Decision {id}: Stage transition ...` : Changement de stade détecté
- `✅ Decision {id}: All participants consented, closing early` : Clôture anticipée
- `⏰ Decision {id}: Deadline reached, closing automatically` : Clôture automatique

## Dépannage

### Le cron ne s'exécute pas

- Vérifiez que `CRON_SECRET` est bien défini dans `.env`
- Vérifiez que le serveur Next.js est bien démarré
- Testez l'endpoint manuellement avec curl
- Vérifiez les logs du serveur pour d'éventuelles erreurs

### Les notifications ne sont pas envoyées

- Vérifiez que `RESEND_API_KEY` est configuré
- Vérifiez les logs d'emails dans la console du serveur
- Testez l'envoi d'email avec une décision de test

### Erreur 401 Unauthorized

- Vérifiez que le header `Authorization: Bearer YOUR_SECRET` est correct
- Vérifiez que `CRON_SECRET` dans `.env` correspond au token utilisé

## Support

Pour toute question ou problème, consultez la documentation ou créez une issue sur le dépôt GitHub.
