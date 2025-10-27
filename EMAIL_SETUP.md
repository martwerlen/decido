# Configuration de l'envoi d'emails

Ce guide explique comment configurer l'envoi d'emails dans Decido sans avoir besoin de créer un compte sur un service externe.

## Options disponibles

Decido supporte 4 méthodes d'envoi d'emails :

1. **Console** (par défaut) - Aucune configuration requise
2. **Ethereal** - Service de test gratuit, aucune configuration requise
3. **Gmail** - Utilisez votre compte Gmail existant
4. **SMTP** - N'importe quel serveur SMTP

## 1. Mode Console (Développement)

**Configuration : AUCUNE ! C'est le mode par défaut.**

Les emails ne sont pas vraiment envoyés mais affichés dans la console. Parfait pour le développement local.

### Configuration dans .env

```env
# Rien à configurer ! C'est le mode par défaut
# Ou explicitement :
EMAIL_PROVIDER="console"
```

### Exemple de sortie

Quand un email d'invitation est envoyé :

```
📧 ===== EMAIL SENT (CONSOLE MODE) =====
To: jean.dupont@example.com
Subject: Invitation à rejoindre Mon Organisation sur Decido

Invitation URL: http://localhost:3000/invitations/accept?token=abc123...

========================================
```

**Avantages :**
- Aucune configuration requise
- Pas besoin de connexion internet
- Parfait pour le développement

**Inconvénients :**
- Les emails ne sont pas vraiment envoyés
- Impossible de tester le rendu HTML

---

## 2. Mode Ethereal (Test)

**Configuration : AUCUNE !**

[Ethereal Email](https://ethereal.email/) est un service de test gratuit. Les emails ne sont pas vraiment envoyés mais peuvent être visualisés en ligne avec un rendu HTML complet.

### Configuration dans .env

```env
EMAIL_PROVIDER="ethereal"
```

### Comment ça marche

1. Au démarrage, Ethereal crée automatiquement un compte de test temporaire
2. Les identifiants s'affichent dans la console
3. Chaque email envoyé génère une URL de preview
4. Cliquez sur l'URL pour voir l'email avec le rendu HTML

### Exemple de sortie

```
📧 Email configured with Ethereal (test mode)
   View emails at: https://ethereal.email/messages
   User: lorem.ipsum@ethereal.email
   Pass: abc123xyz

📧 ===== EMAIL SENT (ETHEREAL TEST) =====
Preview URL: https://ethereal.email/message/YourMessageID
=========================================
```

**Avantages :**
- Aucune configuration requise
- Voir le rendu HTML complet
- Parfait pour tester les templates d'email

**Inconvénients :**
- Les emails ne sont pas vraiment envoyés
- Compte temporaire (expire après quelques heures d'inactivité)

---

## 3. Mode Gmail (Production Simple)

**Utilisez votre compte Gmail existant !**

C'est l'option la plus simple pour envoyer de vrais emails en production si vous avez un compte Gmail.

### Configuration dans .env

```env
EMAIL_PROVIDER="gmail"
EMAIL_USER="votre.email@gmail.com"
EMAIL_PASSWORD="votre-app-password"
FROM_EMAIL="votre.email@gmail.com"
FROM_NAME="Decido"
```

### Obtenir un App Password Gmail

Gmail nécessite un "App Password" (pas votre mot de passe normal) :

1. Allez sur [myaccount.google.com/security](https://myaccount.google.com/security)
2. Activez la **validation en 2 étapes** (obligatoire)
3. Retournez sur la page sécurité
4. Cherchez "Mots de passe d'application" ou "App Passwords"
5. Créez un nouveau mot de passe d'application :
   - Application : **Mail**
   - Appareil : **Autre** (nommez-le "Decido")
6. Copiez le mot de passe de 16 caractères généré (exemple: `abcd efgh ijkl mnop`)
7. Utilisez ce mot de passe dans `EMAIL_PASSWORD` (sans espaces)

### Exemple complet

```env
EMAIL_PROVIDER="gmail"
EMAIL_USER="contact@monentreprise.com"
EMAIL_PASSWORD="abcdefghijklmnop"
FROM_EMAIL="contact@monentreprise.com"
FROM_NAME="Mon Entreprise"
```

**Avantages :**
- Utilise un compte existant
- Configuration simple
- Emails vraiment envoyés
- Gratuit jusqu'à 500 emails/jour

**Inconvénients :**
- Nécessite d'activer la 2FA sur Gmail
- Limite de 500 emails/jour
- Tous les emails proviennent de votre Gmail

---

## 4. Mode SMTP (Production Avancée)

Utilisez n'importe quel serveur SMTP (Outlook, serveur d'entreprise, etc.)

### Configuration dans .env

```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-username"
SMTP_PASSWORD="your-password"
FROM_EMAIL="noreply@votredomaine.com"
FROM_NAME="Votre Application"
```

### Exemples de configuration

#### Outlook / Hotmail / Live

```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="votre.email@outlook.com"
SMTP_PASSWORD="votre-mot-de-passe"
FROM_EMAIL="votre.email@outlook.com"
FROM_NAME="Decido"
```

#### Office 365

```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.office365.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="votre.email@votredomaine.com"
SMTP_PASSWORD="votre-mot-de-passe"
FROM_EMAIL="votre.email@votredomaine.com"
FROM_NAME="Decido"
```

#### Serveur SMTP personnalisé avec SSL

```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="mail.votreserveur.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="noreply@votredomaine.com"
SMTP_PASSWORD="votre-mot-de-passe"
FROM_EMAIL="noreply@votredomaine.com"
FROM_NAME="Decido"
```

**Avantages :**
- Contrôle total
- Utilisez votre propre domaine
- Pas de limite (selon votre serveur)

**Inconvénients :**
- Configuration plus complexe
- Nécessite un serveur SMTP

---

## Recommandations par environnement

### Développement local
```env
EMAIL_PROVIDER="console"
```
Aucune configuration, emails dans la console.

### Tests / Staging
```env
EMAIL_PROVIDER="ethereal"
```
Voir les emails avec rendu HTML sans configuration.

### Production (petit projet)
```env
EMAIL_PROVIDER="gmail"
EMAIL_USER="votre.email@gmail.com"
EMAIL_PASSWORD="votre-app-password"
FROM_EMAIL="votre.email@gmail.com"
FROM_NAME="Decido"
```
Simple et gratuit avec Gmail.

### Production (projet professionnel)
```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.votredomaine.com"
# ... configuration SMTP complète
```
Utilisez votre serveur SMTP ou celui de votre hébergeur.

---

## Dépannage

### Les emails Gmail ne partent pas

**Problème :** `Invalid login: 535-5.7.8 Username and Password not accepted`

**Solutions :**
1. Vérifiez que la 2FA est activée sur Gmail
2. Utilisez un App Password, pas votre mot de passe normal
3. Supprimez les espaces dans l'App Password
4. Vérifiez que l'email dans `EMAIL_USER` est correct

### Les emails Ethereal ne s'affichent pas

**Problème :** Pas d'URL de preview dans la console

**Solutions :**
1. Vérifiez que `EMAIL_PROVIDER="ethereal"` est bien défini
2. Regardez les logs au démarrage pour les identifiants Ethereal
3. Vérifiez votre connexion internet (Ethereal a besoin d'internet)

### Les emails SMTP échouent

**Problème :** `Connection timeout` ou `ECONNREFUSED`

**Solutions :**
1. Vérifiez le `SMTP_HOST` et `SMTP_PORT`
2. Pour le port 465, utilisez `SMTP_SECURE="true"`
3. Pour le port 587, utilisez `SMTP_SECURE="false"`
4. Vérifiez que votre firewall autorise la connexion SMTP
5. Contactez votre hébergeur pour les paramètres SMTP corrects

---

## Tester votre configuration

### 1. Démarrez l'application

```bash
npm run dev
```

Vérifiez la console au démarrage :
- Mode console : `📧 Email configured in CONSOLE mode`
- Mode Ethereal : `📧 Email configured with Ethereal (test mode)` + identifiants
- Mode Gmail : `📧 Email configured with Gmail`
- Mode SMTP : `📧 Email configured with SMTP: smtp.example.com`

### 2. Créez une organisation

Allez sur `/organizations/new` et créez une organisation.

### 3. Invitez un membre

Sur `/organizations/[id]/members`, ajoutez un membre avec un email.

### 4. Vérifiez l'email

- **Console** : L'URL d'invitation s'affiche dans la console
- **Ethereal** : Cliquez sur l'URL de preview dans la console
- **Gmail/SMTP** : Vérifiez la boîte de réception du destinataire

---

## Passer d'un mode à l'autre

Il suffit de changer `EMAIL_PROVIDER` dans votre `.env` et redémarrer l'application :

```bash
# Développement
EMAIL_PROVIDER="console"

# Tests
EMAIL_PROVIDER="ethereal"

# Production
EMAIL_PROVIDER="gmail"
# ou
EMAIL_PROVIDER="smtp"
```

**Pas besoin de modifier le code !**

---

## Pour aller plus loin

### Personnaliser les templates d'email

Les templates HTML sont dans `/lib/email.ts` :
- `sendInvitationEmail()` - Email d'invitation
- `sendWelcomeEmail()` - Email de bienvenue

### Ajouter un nouveau type d'email

1. Créez une nouvelle fonction dans `/lib/email.ts`
2. Utilisez le pattern existant avec `getTransporter()`
3. Les emails s'adapteront automatiquement au `EMAIL_PROVIDER` configuré

---

## Besoin d'aide ?

- **Gmail App Password** : [support.google.com/accounts/answer/185833](https://support.google.com/accounts/answer/185833)
- **Ethereal Email** : [ethereal.email](https://ethereal.email/)
- **Nodemailer Docs** : [nodemailer.com](https://nodemailer.com/)
