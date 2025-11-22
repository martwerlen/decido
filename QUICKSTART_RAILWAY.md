# 🚀 Démarrage rapide - Déploiement Railway

Guide condensé pour déployer Decidoo sur Railway en 10 minutes.

## Prérequis

- ✅ Compte GitHub avec votre code
- ✅ Compte Railway (gratuit) → [railway.app](https://railway.app)
- ✅ Compte Resend (gratuit) → [resend.com](https://resend.com)

## Étape 1 : Générer les secrets (2 min)

```bash
# Générez vos secrets
./scripts/generate-secrets.sh

# Ou manuellement :
openssl rand -base64 32  # NEXTAUTH_SECRET
openssl rand -hex 32     # CRON_SECRET
```

**Gardez ces valeurs sous la main !**

## Étape 2 : Créer le projet Railway (3 min)

1. Allez sur [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Sélectionnez votre repository `decidoo`
4. Cliquez sur **New** → **Database** → **Add PostgreSQL**

## Étape 3 : Configurer les variables d'environnement (3 min)

Dans Railway, onglet **Variables**, ajoutez :

```bash
NEXTAUTH_SECRET=<valeur générée étape 1>
NEXTAUTH_URL=${{RAILWAY_PUBLIC_DOMAIN}}
CRON_SECRET=<valeur générée étape 1>
```

### Resend (emails)

1. Créez un compte sur [resend.com](https://resend.com)
2. Générez une **API Key** (Settings → API Keys)
3. Ajoutez dans Railway :

```bash
RESEND_API_KEY=re_VotreCleAPI
FROM_EMAIL=onboarding@resend.dev
```

> 💡 Utilisez `onboarding@resend.dev` pour tester, ou configurez votre propre domaine

## Étape 4 : Déployer (2 min)

Railway déploie automatiquement ! Attendez ~3-5 minutes.

Vous pouvez suivre les logs en temps réel dans l'onglet **Deployments**.

## Étape 5 : Configurer les 4 cron jobs (optionnel, 5 min)

Decidoo utilise **4 tâches automatisées** :
- ⏰ **check-deadlines** - Fermer les décisions expirées (15 min)
- 🔄 **check-consent-stages** - Avancer les stages CONSENT (15 min)
- 📧 **send-reminders** - Rappels avant deadline (quotidien 9h)
- 🗑️ **cleanup-tokens** - Nettoyer les données expirées (quotidien 2h)

### Option A : GitHub Actions (recommandé, 2 min)

Le workflow est **déjà configuré** ! Il suffit d'ajouter 2 secrets :

1. GitHub : **Settings** → **Secrets and variables** → **Actions**
2. Ajoutez :
   - `CRON_SECRET` = votre secret cron
   - `RAILWAY_URL` = `https://votre-app.up.railway.app`

✅ **C'est tout !** Les 4 cron jobs s'exécutent automatiquement.

### Option B : cron-job.org (alternatif)

Créez 4 cron jobs sur [cron-job.org](https://cron-job.org) (voir [guide complet](./RAILWAY_DEPLOYMENT.md#8-configurer-les-cron-jobs-4-tâches-automatisées) pour les détails)

## ✅ Vérification finale

1. **Accédez à votre app** : `https://votre-app.up.railway.app`
2. **Créez un compte** : `/auth/signup`
3. **Créez une organisation**
4. **Testez une décision**

## 🎉 C'est prêt !

Votre application Decidoo est maintenant en production.

## 🆘 Problèmes ?

Consultez le guide complet : [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

### Erreurs courantes

**Erreur : "Prisma Client not generated"**
→ Railway exécute automatiquement `postinstall` qui génère le client

**Erreur : "Can't reach database"**
→ Vérifiez que PostgreSQL est bien démarré dans Railway

**Emails non envoyés**
→ Vérifiez `RESEND_API_KEY` et utilisez `onboarding@resend.dev` pour tester

## 📚 Prochaines étapes

- [ ] Configurer un domaine personnalisé (Settings → Domains)
- [ ] Inviter des membres à votre organisation
- [ ] Configurer votre propre domaine email sur Resend
- [ ] Activer le monitoring des logs (Railway Dashboard)

---

**Besoin d'aide ?** Consultez la [documentation Railway](https://docs.railway.app) ou le [guide complet](./RAILWAY_DEPLOYMENT.md)
