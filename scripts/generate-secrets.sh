#!/bin/bash

# Script pour générer les secrets nécessaires au déploiement Railway

echo "🔐 Génération des secrets pour Railway"
echo "======================================="
echo ""

echo "NEXTAUTH_SECRET:"
openssl rand -base64 32
echo ""

echo "CRON_SECRET:"
openssl rand -hex 32
echo ""

echo "✅ Copiez ces valeurs dans Railway (onglet Variables)"
echo ""
echo "📧 N'oubliez pas de configurer Resend :"
echo "   1. Créez un compte sur https://resend.com"
echo "   2. Générez une clé API"
echo "   3. Ajoutez RESEND_API_KEY dans Railway"
echo ""
