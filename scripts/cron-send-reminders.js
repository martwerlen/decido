#!/usr/bin/env node

/**
 * Cron Job: Envoyer des rappels de vote
 * Fréquence: Tous les jours à 9h (UTC)
 *
 * Ce script envoie des emails de rappel aux participants qui n'ont pas encore voté
 * pour les décisions se terminant dans les 24 prochaines heures.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@decidoo.fr';
const APP_URL = process.env.APP_URL;

async function sendReminders() {
  console.log(`⏰ [${new Date().toISOString()}] Début du cron: envoi des rappels`);

  if (!RESEND_API_KEY) {
    console.log('⚠️ RESEND_API_KEY non configuré, simulation d\'envoi uniquement');
  }

  try {
    // Trouver les décisions qui se terminent dans les 24 prochaines heures
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const decisions = await prisma.decision.findMany({
      where: {
        status: 'OPEN',
        endDate: {
          gte: now,
          lte: in24Hours
        }
      },
      include: {
        organization: {
          select: { name: true, slug: true }
        },
        participants: {
          where: {
            hasVoted: false,
            userId: { not: null }  // Uniquement les membres internes
          },
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      }
    });

    console.log(`📧 ${decisions.length} décision(s) nécessitent des rappels`);

    let emailsSent = 0;

    for (const decision of decisions) {
      const hoursLeft = Math.round((decision.endDate.getTime() - now.getTime()) / (1000 * 60 * 60));

      for (const participant of decision.participants) {
        if (!participant.user) continue;

        const voteUrl = `${APP_URL}/organizations/${decision.organization.slug}/decisions/${decision.id}/vote`;

        const emailHtml = `
          <h2>⏰ Rappel : Votre vote est attendu</h2>
          <p>Bonjour ${participant.user.name},</p>
          <p>La décision "<strong>${decision.title}</strong>" se termine dans <strong>${hoursLeft}h</strong> et vous n'avez pas encore voté.</p>
          <p>Organisation : ${decision.organization.name}</p>
          <p><a href="${voteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4a7c59; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">Voter maintenant</a></p>
          <p>Si vous ne pouvez pas voter, vous pouvez ignorer ce message.</p>
        `;

        if (RESEND_API_KEY) {
          try {
            const response = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: FROM_EMAIL,
                to: participant.user.email,
                subject: `⏰ Rappel : Votez avant la fin de "${decision.title}"`,
                html: emailHtml
              })
            });

            if (response.ok) {
              emailsSent++;
              console.log(`✅ Email envoyé à ${participant.user.email} pour "${decision.title}"`);
            } else {
              const error = await response.text();
              console.error(`❌ Erreur envoi email à ${participant.user.email}:`, error);
            }
          } catch (error) {
            console.error(`❌ Erreur envoi email:`, error);
          }
        } else {
          console.log(`[SIMULATION] Email à ${participant.user.email} pour "${decision.title}" (${hoursLeft}h restantes)`);
          emailsSent++;
        }
      }
    }

    console.log(`✅ Cron terminé: ${emailsSent} email(s) envoyé(s)`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur durant le cron:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

sendReminders();
