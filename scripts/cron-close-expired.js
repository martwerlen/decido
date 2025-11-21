#!/usr/bin/env node

/**
 * Cron Job: Fermer les décisions expirées
 * Fréquence: Toutes les heures
 *
 * Ce script ferme automatiquement les décisions dont la deadline est passée
 * et qui sont toujours en statut OPEN.
 */

const https = require('https');

const APP_URL = process.env.APP_URL;
const CRON_SECRET = process.env.CRON_SECRET;

if (!APP_URL || !CRON_SECRET) {
  console.error('❌ Variables manquantes: APP_URL et CRON_SECRET sont requis');
  process.exit(1);
}

const url = `${APP_URL}/api/cron/close-expired-decisions`;

console.log(`⏰ [${new Date().toISOString()}] Début du cron: fermeture des décisions expirées`);
console.log(`🔗 URL: ${url}`);

const options = {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
    'User-Agent': 'Decidoo-Cron/1.0'
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
        console.log(`✅ Succès: ${result.closed || 0} décision(s) fermée(s)`);
        console.log(`📊 Détails:`, result);
        process.exit(0);
      } catch (error) {
        console.error('❌ Erreur de parsing JSON:', error);
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

req.end();
