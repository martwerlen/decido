# Génération de votes aléatoires pour le vote nuancé

## Instructions pour exécuter le script

Le script `generate-votes.ts` a été créé pour générer 25 votes aléatoires pour le vote public `http://localhost:3000/public-vote/apm/testallezla`.

### Prérequis

1. Avoir une base de données avec :
   - Une organisation avec le slug `apm`
   - Une décision avec `publicSlug = "testallezla"`
   - La décision doit être de type `NUANCED_VOTE`
   - La décision doit avoir des propositions

### Exécution dans ton environnement local

```bash
# 1. S'assurer que le client Prisma est généré
npm run db:generate

# 2. Exécuter le script
npx tsx generate-votes.ts
```

### Ce que fait le script

1. Trouve l'organisation "apm"
2. Trouve la décision avec le publicSlug "testallezla"
3. Génère 25 votes aléatoires avec des IP uniques
4. Pour chaque vote, attribue une mention aléatoire à chaque proposition

### Notes

- Chaque vote a une IP unique (générée aléatoirement)
- Les IPs sont hachées en SHA-256 pour l'anonymat
- Les mentions sont choisies aléatoirement selon l'échelle configurée (3, 5 ou 7 niveaux)
- Le script évite les doublons d'IP

### Si la décision n'existe pas encore

Tu peux créer une décision avec ces caractéristiques :
- Organisation : `apm` (slug)
- Type : Vote nuancé (NUANCED_VOTE)
- Mode : Vote anonyme via URL
- Slug public : `testallezla`
- Échelle : 7 niveaux (ou ce que tu préfères)
- Au moins 2 propositions
