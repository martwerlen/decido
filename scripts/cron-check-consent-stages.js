#!/usr/bin/env node

/**
 * Cron Job: Vérifier et mettre à jour les stades des décisions CONSENT
 * Fréquence: Toutes les 15 minutes (recommandé)
 *
 * Ce script gère les transitions automatiques des décisions par consentement :
 * - Détecte les changements de stade (CLARIFICATIONS → AVIS → AMENDEMENTS → OBJECTIONS → TERMINEE)
 * - Envoie des notifications email aux participants lors des transitions
 * - Ferme automatiquement les décisions si tous les participants consentent
 * - Ferme les décisions dont la deadline est atteinte
 */

const https = require('https');

const APP_URL = process.env.APP_URL;
const CRON_SECRET = process.env.CRON_SECRET;

if (!APP_URL || !CRON_SECRET) {
  console.error('❌ Variables manquantes: APP_URL et CRON_SECRET sont requis');
  process.exit(1);
}

const url = `${APP_URL}/api/cron/check-consent-stages`;

console.log(`⏰ [${new Date().toISOString()}] Début du cron: vérification des stades CONSENT`);
console.log(`🔗 URL: ${url}`);

const options = {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
    'User-Agent': 'Decidoo-Cron-Consent/1.0'
  }
};

const req = https.request(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const result = JSON.parse(data);
        console.log(`✅ Succès: ${result.processedCount || 0} décision(s) traitée(s)`);
        console.log(`📊 Détails:`);
        console.log(`   - Total décisions CONSENT ouvertes: ${result.totalDecisions || 0}`);
        console.log(`   - Transitions de stade détectées: ${result.processedCount || 0}`);
        console.log(`   - Notifications envoyées: ${result.notificationsCount || 0}`);
        console.log(`   - Décisions fermées automatiquement: ${result.closedCount || 0}`);

        if (result.processedCount > 0 || result.closedCount > 0) {
          console.log(`🎯 Actions effectuées - Vérifiez les logs de l'application pour les détails`);
        }

        process.exit(0);
      } catch (error) {
        console.error('❌ Erreur de parsing JSON:', error);
        console.error('Réponse reçue:', data);
        process.exit(1);
      }
    } else {
      console.error(`❌ Erreur HTTP ${res.statusCode}: ${data}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur réseau:', error);
  process.exit(1);
});

// Timeout de 30 secondes (traitement peut être long)
req.setTimeout(30000, () => {
  console.error('❌ Timeout: La requête a pris plus de 30 secondes');
  req.destroy();
  process.exit(1);
});

req.end();
