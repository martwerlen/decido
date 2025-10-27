# Configuration Prisma - Guide de dépannage

## ✅ État actuel

- ✅ Base de données SQLite créée (`dev.db`)
- ✅ Schéma Prisma configuré
- ✅ Migrations initialisées
- ✅ Toutes les tables créées correctement
- ❌ Client Prisma non généré (blocage réseau)

## 🔍 Problème actuel

Le client Prisma ne peut pas être généré à cause d'un blocage réseau :

```
Error: Failed to fetch the engine file at https://binaries.prisma.sh/...
- 403 Forbidden / Access denied
```

## 🛠️ Solutions

### Solution 1 : Débloquer l'accès réseau (RECOMMANDÉ)

Les binaires Prisma doivent être téléchargés depuis `binaries.prisma.sh`.

**Vérifier l'accès** :
```bash
curl -I https://binaries.prisma.sh/all_commits/11f085a2012c0f4778414c8db2651556ee0ef959/debian-openssl-3.0.x/libquery_engine.so.node.gz
```

Si vous obtenez "Access denied", contactez votre administrateur système pour :
- Autoriser l'accès à `binaries.prisma.sh`
- Configurer un proxy si nécessaire
- Vérifier les règles de firewall

### Solution 2 : Copier les binaires depuis une autre machine

Sur une machine avec internet fonctionnel :

```bash
# 1. Installer les dépendances
npm install

# 2. Générer le client Prisma
npx prisma generate

# 3. Créer une archive des binaires
tar -czf prisma-binaries.tar.gz \
  node_modules/.prisma/client \
  node_modules/@prisma/client \
  node_modules/@prisma/engines

# 4. Transférer prisma-binaries.tar.gz vers le serveur
```

Sur le serveur :

```bash
# 1. Extraire les binaires
tar -xzf prisma-binaries.tar.gz

# 2. Installer les autres dépendances
npm install --ignore-scripts

# 3. Vérifier que ça fonctionne
node -e "const { PrismaClient } = require('@prisma/client'); console.log('OK')"
```

### Solution 3 : Utiliser Docker

Créer un `Dockerfile` :

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers
COPY package*.json ./
COPY prisma ./prisma

# Installer et générer Prisma
RUN npm install
RUN npx prisma generate

# Copier le reste de l'application
COPY . .

CMD ["npm", "run", "dev"]
```

## 🧪 Vérification

Une fois le client Prisma généré, vérifiez :

```bash
# 1. Vérifier que le client existe
ls -la node_modules/.prisma/client/

# 2. Vérifier la cohérence du schéma
node scripts/verify-schema.js

# 3. Tester une requête
node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.user.findMany().then(console.log).catch(console.error);
"
```

## 📊 Structure de la base de données

La base de données a été créée avec les tables suivantes :

- `users` - Utilisateurs
- `accounts` - Comptes NextAuth
- `sessions` - Sessions NextAuth
- `organizations` - Organisations
- `organization_members` - Membres d'organisations
- `non_user_members` - Membres sans compte utilisateur
- `invitations` - Invitations
- `teams` - Équipes
- `team_members` - Membres d'équipes
- `decisions` - Décisions
- `votes` - Votes
- `comments` - Commentaires
- `tags` - Tags
- `decision_tags` - Association décisions-tags

## 🔄 Migrations

Les migrations sont stockées dans `prisma/migrations/`.

Pour créer une nouvelle migration après modification du schéma :

```bash
npx prisma migrate dev --name nom_de_la_migration
```

## 📞 Support

Si le problème persiste, vérifiez :
1. La configuration réseau
2. Les variables d'environnement (`DATABASE_URL`)
3. Les logs d'erreur complets
4. La version de Prisma dans `package.json`
