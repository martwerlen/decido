# Comptes de Test pour l'Organisation APM

Ce document contient les informations pour créer 15 comptes de test dans l'organisation APM.

## Mot de passe universel
**Tous les comptes utilisent le même mot de passe:** `test123`

## Liste des 15 utilisateurs

### Admins (3)
1. **Alice Martin**
   - Email: `alice.martin@test.apm`
   - Rôle: ADMIN

2. **François Moreau**
   - Email: `francois.moreau@test.apm`
   - Rôle: ADMIN

3. **Marie Bonnet**
   - Email: `marie.bonnet@test.apm`
   - Rôle: ADMIN

### Membres (12)
4. **Bruno Dupont**
   - Email: `bruno.dupont@test.apm`
   - Rôle: MEMBER

5. **Céline Bernard**
   - Email: `celine.bernard@test.apm`
   - Rôle: MEMBER

6. **David Petit**
   - Email: `david.petit@test.apm`
   - Rôle: MEMBER

7. **Emma Durand**
   - Email: `emma.durand@test.apm`
   - Rôle: MEMBER

8. **Gabrielle Simon**
   - Email: `gabrielle.simon@test.apm`
   - Rôle: MEMBER

9. **Hugo Laurent**
   - Email: `hugo.laurent@test.apm`
   - Rôle: MEMBER

10. **Isabelle Lefevre**
    - Email: `isabelle.lefevre@test.apm`
    - Rôle: MEMBER

11. **Julien Roux**
    - Email: `julien.roux@test.apm`
    - Rôle: MEMBER

12. **Karine Fournier**
    - Email: `karine.fournier@test.apm`
    - Rôle: MEMBER

13. **Laurent Girard**
    - Email: `laurent.girard@test.apm`
    - Rôle: MEMBER

14. **Nicolas Meyer**
    - Email: `nicolas.meyer@test.apm`
    - Rôle: MEMBER

15. **Olivia Blanc**
    - Email: `olivia.blanc@test.apm`
    - Rôle: MEMBER

## Équipes suggérées

### Équipe Technique (4 membres)
- Alice Martin (ADMIN)
- Bruno Dupont
- David Petit
- Hugo Laurent

### Équipe Marketing (4 membres)
- Céline Bernard
- Emma Durand
- Gabrielle Simon
- Marie Bonnet (ADMIN)

### Équipe Administration (3 membres)
- François Moreau (ADMIN)
- Isabelle Lefevre
- Karine Fournier

## Comment créer les comptes manuellement

### Option 1: Via l'interface web (Recommandé pour quelques comptes)

1. Allez sur `/auth/signup`
2. Pour chaque utilisateur:
   - Nom: [Nom complet]
   - Email: [Email ci-dessus]
   - Mot de passe: `test123`
   - Confirmation: `test123`
3. Une fois connecté, rejoindre l'organisation APM (si elle existe)

### Option 2: Via SQL direct (Rapide pour tous les comptes)

Utilisez le fichier `seed-apm-sql.sql` pour insérer tous les comptes d'un coup dans votre base SQLite.

**Note:** Le hash bcrypt pour le mot de passe `test123` est :
```
$2a$10$YourHashHere
```

Les hashes varient, donc vous devrez générer le vôtre ou utiliser le script fourni.

## Pour tester les optimisations de performance

Une fois les 15 comptes créés et ajoutés à l'organisation APM:

1. **Test #3 - Création de décision avec participants:**
   - Créer une nouvelle décision
   - Sélectionner les 3 équipes (12 participants)
   - Ajouter 3 membres manuels supplémentaires
   - Vérifier que la création est rapide

2. **Test #4 - Page de vote:**
   - Accéder à une décision existante
   - Vérifier le chargement rapide de la page `/vote`

3. **Test #5 - Dropdown organisations:**
   - Ouvrir le Sidebar
   - Cliquer sur le dropdown des organisations
   - Vérifier l'ouverture instantanée

## Script automatique (Alternative)

Si vous avez accès à la console du serveur, utilisez:

```bash
# IMPORTANT: D'abord, générez le client Prisma
# Si la génération échoue à cause de problèmes réseau, utilisez les binaires pré-compilés

# Option A: Télécharger les binaires manuellement (si problèmes réseau)
# https://github.com/prisma/prisma/tree/main/packages/engines

# Option B: Utiliser le script de seeding (après avoir résolu Prisma)
node seed-users.mjs
```

---

**Note importante:** Les emails `@test.apm` sont fictifs et ne fonctionneront pas pour l'envoi d'emails réels. C'est parfait pour les tests locaux.
