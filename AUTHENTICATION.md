# Module d'authentification Decido

Ce document décrit l'installation et l'utilisation du module d'authentification pour Decido.

## Installation terminée

Le module de connexion a été installé avec succès. Voici ce qui a été configuré :

### 1. Dépendances installées

- `next-auth@^5.0.0-beta.25` - Framework d'authentification
- `@auth/prisma-adapter` - Adaptateur Prisma pour NextAuth
- `bcryptjs` - Hash des mots de passe
- `@types/bcryptjs` - Types TypeScript

### 2. Configuration NextAuth

**Fichier : `lib/auth.ts`**
- Configuration NextAuth avec stratégie JWT
- Provider Credentials pour authentification par email/mot de passe
- Callbacks pour gérer la session et le token JWT
- Adaptateur Prisma pour la base de données

### 3. Routes API

**Fichier : `app/api/auth/[...nextauth]/route.ts`**
- Route API NextAuth pour gérer l'authentification

**Fichier : `app/api/auth/signup/route.ts`**
- Endpoint pour l'inscription des nouveaux utilisateurs
- Validation des données
- Hash du mot de passe avec bcrypt
- Vérification des emails existants

### 4. Pages d'authentification

**Connexion : `app/auth/signin/page.tsx`**
- Page de connexion avec formulaire
- Lien vers la page d'inscription

**Inscription : `app/auth/signup/page.tsx`**
- Page d'inscription avec formulaire
- Validation côté client
- Lien vers la page de connexion

### 5. Composants

**`components/auth/SignInForm.tsx`**
- Formulaire de connexion client
- Gestion des erreurs
- Redirection après connexion réussie

**`components/auth/SignUpForm.tsx`**
- Formulaire d'inscription client
- Validation du mot de passe (min 8 caractères)
- Confirmation du mot de passe

**`components/providers/SessionProvider.tsx`**
- Provider NextAuth pour l'application
- Permet l'utilisation de `useSession` dans les composants

### 6. Types TypeScript

**Fichier : `types/next-auth.d.ts`**
- Extension des types NextAuth
- Ajout de l'ID utilisateur dans la session

### 7. Configuration base de données

Le schéma Prisma contient déjà les tables nécessaires :
- `User` - Utilisateurs
- `Account` - Comptes de providers OAuth (pour future extension)
- `Session` - Sessions utilisateur

## Configuration requise

### 1. Variables d'environnement

Copiez `.env.example` vers `.env` et configurez :

```bash
cp .env.example .env
```

Modifiez les valeurs dans `.env` :

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<générez-un-secret-sécurisé>"
```

Pour générer un secret sécurisé :
```bash
openssl rand -base64 32
```

### 2. Appliquer les migrations

```bash
# Générer le client Prisma
npm run db:generate

# Appliquer le schéma à la base de données
npm run db:push

# Ou avec migrations
npm run db:migrate
```

### 3. Démarrer l'application

```bash
npm run dev
```

## Utilisation

### Inscription

1. Accédez à `/auth/signup`
2. Remplissez le formulaire avec :
   - Nom
   - Email
   - Mot de passe (min 8 caractères)
   - Confirmation du mot de passe
3. Cliquez sur "S'inscrire"
4. Vous serez redirigé vers la page de connexion

### Connexion

1. Accédez à `/auth/signin`
2. Entrez votre email et mot de passe
3. Cliquez sur "Se connecter"
4. Vous serez redirigé vers la page d'accueil

### Dans les composants

#### Composants serveur

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return <div>Bonjour {session.user.name}</div>
}
```

#### Composants client

```typescript
"use client"

import { useSession, signOut } from "next-auth/react"

export default function UserMenu() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Chargement...</div>
  }

  if (!session) {
    return <a href="/auth/signin">Se connecter</a>
  }

  return (
    <div>
      <p>Bonjour {session.user.name}</p>
      <button onClick={() => signOut()}>Déconnexion</button>
    </div>
  )
}
```

### Protection des routes

#### Middleware (recommandé)

Créez `middleware.ts` à la racine :

```typescript
export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/organizations/:path*",
    "/decisions/:path*",
  ]
}
```

#### Route API

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return new Response("Non autorisé", { status: 401 })
  }

  // Votre logique ici
}
```

## Extensions futures

Le module est prêt pour être étendu avec :

- **OAuth Providers** : Google, GitHub, etc.
- **Vérification email** : Envoi d'email de confirmation
- **Réinitialisation mot de passe** : Flow "mot de passe oublié"
- **2FA** : Authentification à deux facteurs
- **Rôles et permissions** : Gestion avancée des droits

## Structure des fichiers

```
decido/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/
│   │       │   └── route.ts
│   │       └── signup/
│   │           └── route.ts
│   ├── auth/
│   │   ├── signin/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   └── layout.tsx (modifié)
├── components/
│   ├── auth/
│   │   ├── SignInForm.tsx
│   │   └── SignUpForm.tsx
│   └── providers/
│       └── SessionProvider.tsx
├── lib/
│   ├── auth.ts
│   └── prisma.ts
├── types/
│   └── next-auth.d.ts
├── .env
└── .env.example
```

## Sécurité

- Les mots de passe sont hashés avec bcrypt (rounds: 12)
- Les sessions utilisent JWT
- Protection CSRF intégrée dans NextAuth
- Validation des entrées sur l'API

## Support

Pour toute question, consultez la documentation :
- [NextAuth.js v5](https://authjs.dev/)
- [Prisma](https://www.prisma.io/docs)
