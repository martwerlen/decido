# Correction du problème d'enums Prisma avec SQLite

## ✅ Problème résolu : Incompatibilité enum/SQLite

Le schéma Prisma utilisait des `enum` qui ne sont **pas supportés par SQLite**.

### Modifications apportées

Tous les enums ont été convertis en champs `String` :

1. **MemberRole** → `String` avec valeurs : `OWNER`, `ADMIN`, `MEMBER`
2. **InvitationStatus** → `String` avec valeurs : `PENDING`, `ACCEPTED`, `EXPIRED`, `CANCELLED`
3. **DecisionType** → `String` avec valeurs : `CONSENSUS`, `CONSENT`, `MAJORITY`, `SUPERMAJORITY`, `WEIGHTED_VOTE`, `ADVISORY`
4. **DecisionStatus** → `String` avec valeurs : `DRAFT`, `OPEN`, `CLOSED`, `IMPLEMENTED`, `ARCHIVED`
5. **DecisionResult** → `String` avec valeurs : `APPROVED`, `REJECTED`, `BLOCKED`, `WITHDRAWN`
6. **VoteValue** → `String` avec valeurs : `STRONG_SUPPORT`, `SUPPORT`, `WEAK_SUPPORT`, `ABSTAIN`, `WEAK_OPPOSE`, `OPPOSE`, `STRONG_OPPOSE`, `BLOCK`

### Structure de la base de données

✅ Base de données créée : `dev.db`
✅ Migration créée : `prisma/migrations/20251027_init_fixed/`
✅ Toutes les tables créées correctement
✅ Schéma Prisma corrigé et validé

## ❌ Problème persistant : Blocage réseau Prisma

Le serveur `binaries.prisma.sh` est bloqué (403 Forbidden) empêchant :
- La génération du client Prisma
- L'utilisation de `prisma generate`
- L'utilisation de `prisma migrate`
- L'utilisation de `prisma db push`

### Erreur rencontrée

```
Error: Failed to fetch sha256 checksum at https://binaries.prisma.sh/...
- 403 Forbidden
```

## 🛠️ Solutions pour débloquer Prisma

### Option 1 : Copier les binaires depuis une autre machine (RECOMMANDÉ)

**Sur une machine avec accès Internet complet :**

```bash
# 1. Cloner le repo
git clone https://github.com/martwerlen/decido
cd decido

# 2. Checkout la bonne branche
git checkout claude/check-prisma-schema-011CUYEtx5R88pXdDHvDixDi

# 3. Installer les dépendances
npm install

# 4. Générer le client Prisma
npx prisma generate

# 5. Créer une archive avec les binaires
tar -czf prisma-complete.tar.gz \
  node_modules/.prisma/client \
  node_modules/@prisma/client \
  node_modules/@prisma/engines \
  node_modules/prisma

# 6. Transférer prisma-complete.tar.gz vers le serveur
```

**Sur le serveur bloqué :**

```bash
# 1. Extraire l'archive
tar -xzf prisma-complete.tar.gz

# 2. Vérifier que ça fonctionne
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); console.log('✅ Client Prisma chargé');"

# 3. Lancer l'application
npm run dev
```

### Option 2 : Configurer un proxy

Si vous avez accès à un proxy :

```bash
export HTTP_PROXY=http://proxy:port
export HTTPS_PROXY=http://proxy:port
npm install
npx prisma generate
```

### Option 3 : Débloquer l'accès réseau

Contactez votre administrateur système pour autoriser :
- Domaine : `binaries.prisma.sh`
- Protocole : HTTPS (443)
- Type : Téléchargement de binaires

### Option 4 : Utiliser Docker

Créer un container avec accès réseau complet :

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copier package files
COPY package*.json ./
COPY prisma ./prisma

# Installer et générer
RUN npm install
RUN npx prisma generate

# Copier le reste
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

Construire et lancer :

```bash
docker build -t decido .
docker run -p 3000:3000 -v $(pwd)/dev.db:/app/dev.db decido
```

## 🧪 Vérification post-installation

Une fois le client Prisma généré, vérifiez :

```bash
# 1. Vérifier que le client existe
ls -la node_modules/.prisma/client/

# 2. Vérifier que c'est pas un stub
grep -q "export const PrismaClient" node_modules/.prisma/client/index.js && echo "✅ Client OK" || echo "❌ Client stub"

# 3. Test rapide
node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.\$connect()
    .then(() => console.log('✅ Connexion DB OK'))
    .catch(e => console.error('❌ Erreur:', e.message))
    .finally(() => prisma.\$disconnect());
"

# 4. Lancer l'app
npm run dev
```

## 📊 État du projet

### ✅ Complété
- [x] Schéma Prisma corrigé (enums → String)
- [x] Base de données créée avec toutes les tables
- [x] Migration SQL générée
- [x] Structure validée
- [x] Fichier `.env` créé

### ⏳ En attente (blocage réseau)
- [ ] Génération du client Prisma
- [ ] Test de l'application

### 📁 Fichiers modifiés
- `prisma/schema.prisma` - Enums convertis en String
- `prisma/migrations/20251027_init_fixed/migration.sql` - Migration corrigée
- `prisma/migrations/migration_lock.toml` - Lock file
- `.env` - Configuration
- `dev.db` - Base de données SQLite

## 📝 Types TypeScript

Les types côté application doivent être mis à jour pour utiliser des unions de string littérales au lieu d'enums :

```typescript
// Avant (avec enums Prisma)
import { MemberRole, VoteValue } from '@prisma/client';

// Après (avec string unions)
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type VoteValue = 'STRONG_SUPPORT' | 'SUPPORT' | 'WEAK_SUPPORT' | 'ABSTAIN' | 'WEAK_OPPOSE' | 'OPPOSE' | 'STRONG_OPPOSE' | 'BLOCK';
// etc...
```

Créer un fichier `types/enums.ts` :

```typescript
// types/enums.ts
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
export type DecisionType = 'CONSENSUS' | 'CONSENT' | 'MAJORITY' | 'SUPERMAJORITY' | 'WEIGHTED_VOTE' | 'ADVISORY';
export type DecisionStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'IMPLEMENTED' | 'ARCHIVED';
export type DecisionResult = 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'WITHDRAWN';
export type VoteValue = 'STRONG_SUPPORT' | 'SUPPORT' | 'WEAK_SUPPORT' | 'ABSTAIN' | 'WEAK_OPPOSE' | 'OPPOSE' | 'STRONG_OPPOSE' | 'BLOCK';

// Helpers de validation
export const MEMBER_ROLES: MemberRole[] = ['OWNER', 'ADMIN', 'MEMBER'];
export const VOTE_VALUES: VoteValue[] = ['STRONG_SUPPORT', 'SUPPORT', 'WEAK_SUPPORT', 'ABSTAIN', 'WEAK_OPPOSE', 'OPPOSE', 'STRONG_OPPOSE', 'BLOCK'];
// etc...
```

## 🆘 Support

Si le problème persiste après avoir essayé ces solutions, vérifiez :
1. Les logs d'erreur complets
2. La configuration réseau (firewall, proxy)
3. Les permissions de téléchargement
4. La version de Node.js (requiert 18+)

Pour plus d'aide : [Prisma Troubleshooting](https://www.prisma.io/docs/guides/other/troubleshooting-orm)
