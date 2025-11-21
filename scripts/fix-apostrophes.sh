#!/bin/bash

# Script pour corriger automatiquement les apostrophes non échappées dans le JSX
# Remplace ' par &apos; dans les contextes JSX courants (texte français)

echo "🔧 Correction des apostrophes non échappées dans les fichiers TSX..."

# Fonction pour remplacer les apostrophes dans un fichier
fix_file() {
    local file="$1"
    echo "  📝 Traitement de $file"

    # Patterns courants en français (élision)
    sed -i "s/>l'/>l\&apos;/g" "$file"
    sed -i "s/>d'/>d\&apos;/g" "$file"
    sed -i "s/>n'/>n\&apos;/g" "$file"
    sed -i "s/>s'/>s\&apos;/g" "$file"
    sed -i "s/>c'/>c\&apos;/g" "$file"
    sed -i "s/>m'/>m\&apos;/g" "$file"
    sed -i "s/>t'/>t\&apos;/g" "$file"
    sed -i "s/>qu'/>qu\&apos;/g" "$file"
    sed -i "s/>j'/>j\&apos;/g" "$file"

    # Apostrophes en milieu de texte (ex: "Merci d'avoir")
    sed -i "s/ d'/ d\&apos;/g" "$file"
    sed -i "s/ l'/ l\&apos;/g" "$file"
    sed -i "s/ n'/ n\&apos;/g" "$file"
    sed -i "s/ s'/ s\&apos;/g" "$file"
    sed -i "s/ c'/ c\&apos;/g" "$file"
    sed -i "s/ qu'/ qu\&apos;/g" "$file"
    sed -i "s/ j'/ j\&apos;/g" "$file"

    # Cas spéciaux avec {" ou "}
    sed -i 's/{" "/{" "/g' "$file"
    sed -i "s/\" '}/\" }/g" "$file"
}

# Liste des fichiers à corriger (selon les erreurs ESLint)
FILES=(
    "app/organizations/[slug]/decisions/[decisionId]/admin/DecisionAdminClient.tsx"
    "app/organizations/[slug]/decisions/[decisionId]/results/ResultsPageClient.tsx"
    "app/organizations/[slug]/decisions/[decisionId]/results/page.tsx"
    "app/organizations/[slug]/decisions/[decisionId]/share/SharePageClient.tsx"
    "app/organizations/[slug]/decisions/[decisionId]/vote/ConsentAccordionStages.tsx"
    "app/organizations/[slug]/decisions/[decisionId]/vote/VotePageClient.tsx"
    "app/organizations/[slug]/decisions/new/page.tsx"
    "app/public-vote/[orgSlug]/[publicSlug]/PublicVotePageClient.tsx"
    "app/public-vote/[orgSlug]/[publicSlug]/page.tsx"
    "components/dashboard/DecisionFilters.tsx"
    "components/feedback/FeedbackModal.tsx"
)

# Traiter chaque fichier
for file in "${FILES[@]}"; do
    if [ -f "/home/user/decido/$file" ]; then
        fix_file "/home/user/decido/$file"
    else
        echo "  ⚠️  Fichier non trouvé: $file"
    fi
done

echo "✅ Correction des apostrophes terminée!"
echo ""
echo "Fichiers modifiés: ${#FILES[@]}"
