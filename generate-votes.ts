import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function generateRandomVotes() {
  try {
    // 1. Trouver l'organisation
    const org = await prisma.organization.findUnique({
      where: { slug: 'apm' },
    });

    if (!org) {
      console.error('Organisation "apm" non trouvée');
      return;
    }

    // 2. Trouver la décision
    const decision = await prisma.decision.findFirst({
      where: {
        organizationId: org.id,
        publicSlug: 'testallezla',
      },
      include: {
        nuancedProposals: true,
      },
    });

    if (!decision) {
      console.error('Décision avec publicSlug="testallezla" non trouvée dans l\'organisation "apm"');
      return;
    }

    console.log(`Décision trouvée: ${decision.title}`);
    console.log(`Type: ${decision.decisionType}`);
    console.log(`Échelle: ${decision.nuancedScale}`);
    console.log(`Nombre de propositions: ${decision.nuancedProposals.length}`);

    if (decision.decisionType !== 'NUANCED_VOTE') {
      console.error('Cette décision n\'est pas un vote nuancé');
      return;
    }

    if (!decision.nuancedScale || decision.nuancedProposals.length === 0) {
      console.error('Décision invalide: pas d\'échelle ou de propositions');
      return;
    }

    // 3. Définir les mentions selon l'échelle
    let mentions: string[] = [];
    if (decision.nuancedScale === '3_LEVELS') {
      mentions = ['GOOD', 'PASSABLE', 'INSUFFICIENT'];
    } else if (decision.nuancedScale === '5_LEVELS') {
      mentions = ['EXCELLENT', 'GOOD', 'PASSABLE', 'INSUFFICIENT', 'TO_REJECT'];
    } else if (decision.nuancedScale === '7_LEVELS') {
      mentions = ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'PASSABLE', 'INSUFFICIENT', 'VERY_INSUFFICIENT', 'TO_REJECT'];
    }

    console.log(`\nGénération de 25 votes aléatoires...`);

    // 4. Générer 25 votes
    for (let i = 0; i < 25; i++) {
      // Générer une IP aléatoire
      const randomIP = `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
      const ipHash = crypto.createHash('sha256').update(randomIP).digest('hex');

      // Vérifier si cette IP a déjà voté
      const existingLog = await prisma.anonymousVoteLog.findUnique({
        where: {
          decisionId_ipHash: {
            decisionId: decision.id,
            ipHash: ipHash,
          },
        },
      });

      if (existingLog) {
        console.log(`Vote ${i + 1}/25: IP déjà utilisée, skip`);
        i--; // Réessayer avec une autre IP
        continue;
      }

      // Créer le log d'IP
      await prisma.anonymousVoteLog.create({
        data: {
          decisionId: decision.id,
          ipHash: ipHash,
        },
      });

      // Pour chaque proposition, créer un vote avec une mention aléatoire
      for (const proposal of decision.nuancedProposals) {
        const randomMention = mentions[Math.floor(Math.random() * mentions.length)];

        await prisma.nuancedVote.create({
          data: {
            decisionId: decision.id,
            proposalId: proposal.id,
            mention: randomMention,
            userId: null,
            externalParticipantId: null,
          },
        });
      }

      console.log(`Vote ${i + 1}/25: Généré avec IP ${randomIP} (hash: ${ipHash.substring(0, 8)}...)`);
    }

    console.log('\n✅ 25 votes aléatoires générés avec succès !');
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateRandomVotes();
