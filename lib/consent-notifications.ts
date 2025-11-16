/**
 * Système de notifications email pour les décisions par consentement
 */

import { sendEmail } from '@/lib/email'
import { ConsentStage } from '@/types/enums'

const fromEmail = process.env.FROM_EMAIL || 'noreply@decidoo.fr'

interface SendConsentNotificationParams {
  participants: Array<{
    email: string
    name: string | null
  }>
  stage: ConsentStage
  decision: {
    id: string
    title: string
    initialProposal: string | null
    proposal: string | null
    organizationSlug: string
  }
  creator: {
    name: string | null
  }
  stageEndDate: Date
}

/**
 * Envoie les notifications email pour un changement de stade
 */
export async function sendConsentStageNotification({
  participants,
  stage,
  decision,
  creator,
  stageEndDate,
}: SendConsentNotificationParams) {
  const creatorName = creator.name || 'Un membre'
  const decisionUrl = `${process.env.NEXTAUTH_URL}/${decision.organizationSlug}/decisions/${decision.id}/vote`

  const formattedDate = stageEndDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const formattedTime = stageEndDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  let subject: string
  let htmlContent: string
  let textContent: string

  switch (stage) {
    case 'CLARIFICATIONS':
      subject = `[Decidoo] Nouvelle décision par consentement : ${decision.title}`
      htmlContent = generateClarificationsEmail(
        creatorName,
        decision.title,
        decision.initialProposal || '',
        formattedDate,
        formattedTime,
        decisionUrl
      )
      textContent = `${creatorName} vient de lancer une décision par consentement nommée "${decision.title}".\n\nLa proposition est de : ${decision.initialProposal}\n\nVous êtes invités jusqu'au ${formattedDate} à ${formattedTime} à poser des questions de clarification.\n\n👉 Cliquez ici pour participer : ${decisionUrl}`
      break

    case 'CLARIFAVIS':
      subject = `[Decidoo] Nouvelle décision par consentement : ${decision.title}`
      htmlContent = generateClarifavisEmail(
        creatorName,
        decision.title,
        decision.initialProposal || '',
        formattedDate,
        formattedTime,
        decisionUrl
      )
      textContent = `${creatorName} vient de lancer une décision par consentement nommée "${decision.title}".\n\nLa proposition est de : ${decision.initialProposal}\n\nVous êtes invités jusqu'au ${formattedDate} à ${formattedTime} à poser des questions de clarification et donner votre avis.\n\n👉 Cliquez ici pour participer : ${decisionUrl}`
      break

    case 'AVIS':
      subject = `[Decidoo] Nouvelle étape : Avis - ${decision.title}`
      htmlContent = generateAvisEmail(
        decision.title,
        decision.initialProposal || '',
        formattedDate,
        formattedTime,
        decisionUrl
      )
      textContent = `Le processus de décision par consentement nommée "${decision.title}" est passé à une autre étape.\n\nÀ présent, vous êtes invités jusqu'au ${formattedDate} à ${formattedTime} à donner votre avis.\n\nPour rappel, la proposition est de : ${decision.initialProposal}\n\n👉 Cliquez ici pour participer : ${decisionUrl}`
      break

    case 'AMENDEMENTS':
      // Cette notification est uniquement pour le créateur
      subject = `[Decidoo] Action requise : Amendements - ${decision.title}`
      htmlContent = generateAmendementsEmail(
        decision.title,
        formattedDate,
        formattedTime,
        decisionUrl
      )
      textContent = `Le processus de décision "${decision.title}" est passé à l'étape d'amendements.\n\nVous avez maintenant jusqu'au ${formattedDate} à ${formattedTime} pour :\n- Amender votre proposition\n- La garder telle quelle\n- La retirer\n\n👉 Cliquez ici pour prendre votre décision : ${decisionUrl}`
      break

    case 'OBJECTIONS':
      const proposalText = decision.proposal
        ? decision.proposal
        : decision.initialProposal || ''
      const isAmended = !!decision.proposal

      subject = `[Decidoo] Dernière étape : Objections - ${decision.title}`
      htmlContent = generateObjectionsEmail(
        decision.title,
        proposalText,
        isAmended,
        formattedDate,
        formattedTime,
        decisionUrl
      )
      textContent = `Le processus de décision par consentement nommée "${decision.title}" est passé à une dernière étape.\n\nÀ présent, vous êtes invités à finaliser la décision et ce jusqu'au ${formattedDate} à ${formattedTime}.\n\nPour information, ${isAmended ? 'la proposition amendée' : 'la proposition'} est de : ${proposalText}\n\n👉 Cliquez ici pour participer : ${decisionUrl}`
      break

    default:
      return // Ne pas envoyer d'email pour les autres stades
  }

  // Envoyer l'email à tous les participants
  const emailPromises = participants.map(participant =>
    sendEmail({
      to: participant.email,
      subject,
      html: htmlContent,
      text: textContent,
    })
  )

  await Promise.all(emailPromises)
}

// Templates HTML pour chaque stade

function generateClarificationsEmail(
  creatorName: string,
  title: string,
  proposal: string,
  date: string,
  time: string,
  url: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nouvelle décision par consentement</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #4a7c59; margin: 0 0 20px 0; font-size: 24px;">
            Nouvelle décision par consentement
          </h1>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            <strong>${creatorName}</strong> vient de lancer une décision par consentement nommée "<strong>${title}</strong>".
          </p>
          <div style="background-color: #ffffff; border-left: 4px solid #4a7c59; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 5px 0; font-size: 14px; color: #666; font-weight: 600;">
              La proposition est de :
            </p>
            <p style="margin: 0; font-size: 16px;">
              ${proposal}
            </p>
          </div>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Vous êtes invités jusqu'au <strong>${date} à ${time}</strong> à poser des questions de clarification.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}"
               style="background-color: #4a7c59; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
              Participer à la décision
            </a>
          </div>
        </div>
        <div style="text-align: center; font-size: 12px; color: #999; padding: 20px 0;">
          <p style="margin: 0;">
            Decidoo - Plateforme collaborative de prise de décision
          </p>
        </div>
      </body>
    </html>
  `
}

function generateClarifavisEmail(
  creatorName: string,
  title: string,
  proposal: string,
  date: string,
  time: string,
  url: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nouvelle décision par consentement</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #4a7c59; margin: 0 0 20px 0; font-size: 24px;">
            Nouvelle décision par consentement
          </h1>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            <strong>${creatorName}</strong> vient de lancer une décision par consentement nommée "<strong>${title}</strong>".
          </p>
          <div style="background-color: #ffffff; border-left: 4px solid #4a7c59; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 5px 0; font-size: 14px; color: #666; font-weight: 600;">
              La proposition est de :
            </p>
            <p style="margin: 0; font-size: 16px;">
              ${proposal}
            </p>
          </div>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Vous êtes invités jusqu'au <strong>${date} à ${time}</strong> à poser des questions de clarification et donner votre avis.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}"
               style="background-color: #4a7c59; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
              Participer à la décision
            </a>
          </div>
        </div>
        <div style="text-align: center; font-size: 12px; color: #999; padding: 20px 0;">
          <p style="margin: 0;">
            Decidoo - Plateforme collaborative de prise de décision
          </p>
        </div>
      </body>
    </html>
  `
}

function generateAvisEmail(
  title: string,
  proposal: string,
  date: string,
  time: string,
  url: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nouvelle étape : Avis</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #4a7c59; margin: 0 0 20px 0; font-size: 24px;">
            Nouvelle étape : Avis
          </h1>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Le processus de décision par consentement nommée "<strong>${title}</strong>" est passé à une autre étape.
          </p>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            À présent, vous êtes invités jusqu'au <strong>${date} à ${time}</strong> à donner votre avis.
          </p>
          <div style="background-color: #ffffff; border-left: 4px solid #4a7c59; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 5px 0; font-size: 14px; color: #666; font-weight: 600;">
              Pour rappel, la proposition est de :
            </p>
            <p style="margin: 0; font-size: 16px;">
              ${proposal}
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}"
               style="background-color: #4a7c59; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
              Participer à la décision
            </a>
          </div>
        </div>
        <div style="text-align: center; font-size: 12px; color: #999; padding: 20px 0;">
          <p style="margin: 0;">
            Decidoo - Plateforme collaborative de prise de décision
          </p>
        </div>
      </body>
    </html>
  `
}

function generateAmendementsEmail(
  title: string,
  date: string,
  time: string,
  url: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Action requise : Amendements</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #d4896b; margin: 0 0 20px 0; font-size: 24px;">
            ⚠️ Action requise : Amendements
          </h1>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Le processus de décision "<strong>${title}</strong>" est passé à l'étape d'amendements.
          </p>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Vous avez maintenant jusqu'au <strong>${date} à ${time}</strong> pour :
          </p>
          <ul style="font-size: 16px; margin: 0 0 20px 0; padding-left: 25px;">
            <li>Amender votre proposition</li>
            <li>La garder telle quelle</li>
            <li>La retirer</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}"
               style="background-color: #d4896b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
              Prendre ma décision
            </a>
          </div>
        </div>
        <div style="text-align: center; font-size: 12px; color: #999; padding: 20px 0;">
          <p style="margin: 0;">
            Decidoo - Plateforme collaborative de prise de décision
          </p>
        </div>
      </body>
    </html>
  `
}

function generateObjectionsEmail(
  title: string,
  proposal: string,
  isAmended: boolean,
  date: string,
  time: string,
  url: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dernière étape : Objections</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #4a7c59; margin: 0 0 20px 0; font-size: 24px;">
            Dernière étape : Objections
          </h1>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Le processus de décision par consentement nommée "<strong>${title}</strong>" est passé à une dernière étape.
          </p>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            À présent, vous êtes invités à finaliser la décision et ce jusqu'au <strong>${date} à ${time}</strong>.
          </p>
          <div style="background-color: #ffffff; border-left: 4px solid #4a7c59; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 5px 0; font-size: 14px; color: #666; font-weight: 600;">
              Pour information, ${isAmended ? 'la proposition amendée' : 'la proposition'} est de :
            </p>
            <p style="margin: 0; font-size: 16px;">
              ${proposal}
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}"
               style="background-color: #4a7c59; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
              Participer à la décision
            </a>
          </div>
        </div>
        <div style="text-align: center; font-size: 12px; color: #999; padding: 20px 0;">
          <p style="margin: 0;">
            Decidoo - Plateforme collaborative de prise de décision
          </p>
        </div>
      </body>
    </html>
  `
}
