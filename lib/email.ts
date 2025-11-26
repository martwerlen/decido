// Configuration email simplifiée - fonctionne sans dépendances externes
// En développement, les emails sont loggés dans la console
// En production, configure RESEND_API_KEY pour envoyer de vrais emails

const fromEmail = process.env.FROM_EMAIL || 'noreply@maintenantoumaintenant.fr';

// Fonction utilitaire pour convertir HTML en texte brut
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

// Interface pour l'envoi d'email générique
interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string; // Optionnel, sera généré depuis HTML si non fourni
}

// Fonction générique d'envoi d'email
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams) {
  const textContent = text || htmlToText(html);

  const emailData = {
    from: fromEmail,
    to: [to],
    subject,
    html,
    text: textContent,
  };

  // Si RESEND_API_KEY est défini, utiliser Resend
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== '') {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const data = await resend.emails.send(emailData);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ Erreur email pour ${to}:`, error);
    }
  }

  // Mode console
  console.log(`📧 [CONSOLE] Email à ${to}: ${subject}`);
  return { success: true, mode: 'console' };
}

interface SendInvitationEmailParams {
  to: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  invitedByName: string;
  invitationToken: string;
}

export async function sendInvitationEmail({
  to,
  firstName,
  lastName,
  organizationName,
  invitedByName,
  invitationToken,
}: SendInvitationEmailParams) {
  const invitationUrl = `${process.env.NEXTAUTH_URL}/invitations/accept?token=${invitationToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation à rejoindre ${organizationName}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0 0 20px 0; font-size: 24px;">
            Invitation à rejoindre Decidoo
          </h1>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Bonjour ${firstName} ${lastName},
          </p>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            <strong>${invitedByName}</strong> vous a invité à rejoindre l'organisation <strong>${organizationName}</strong> sur Decidoo.
          </p>
          <p style="margin: 0 0 25px 0; font-size: 16px;">
            Decidoo est une plateforme collaborative de prise de décision qui permet aux équipes de voter et de prendre des décisions ensemble de manière transparente et démocratique.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}"
               style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
              Accepter l'invitation
            </a>
          </div>
          <p style="margin: 25px 0 0 0; font-size: 14px; color: #666;">
            Ou copiez ce lien dans votre navigateur :
          </p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #2563eb; word-break: break-all;">
            ${invitationUrl}
          </p>
        </div>
        <div style="text-align: center; font-size: 12px; color: #999; padding: 20px 0;">
          <p style="margin: 0 0 5px 0;">
            Cette invitation expirera dans 7 jours.
          </p>
          <p style="margin: 0;">
            Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
          </p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Bonjour ${firstName} ${lastName},

${invitedByName} vous a invité à rejoindre l'organisation ${organizationName} sur Decidoo.

Decidoo est une plateforme collaborative de prise de décision qui permet aux équipes de voter et de prendre des décisions ensemble de manière transparente et démocratique.

Pour accepter cette invitation, veuillez cliquer sur le lien suivant :
${invitationUrl}

Cette invitation expirera dans 7 jours.

Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
  `.trim();

  const emailData = {
    from: fromEmail,
    to: [to],
    subject: `Invitation à rejoindre ${organizationName} sur Decidoo`,
    html: htmlContent,
    text: textContent,
  };

  // Si RESEND_API_KEY est défini, utiliser Resend
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== '') {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const data = await resend.emails.send(emailData);
      console.log(`✅ Invitation envoyée à ${to}`);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ Erreur invitation pour ${to}:`, error);
    }
  }

  // Mode console
  console.log(`📧 [CONSOLE] Invitation à ${to}`);
  console.log(`   Lien: ${invitationUrl}\n`);
  return { success: true, mode: 'console' };
}

interface SendWelcomeEmailParams {
  to: string;
  name: string;
  organizationName: string;
}

export async function sendWelcomeEmail({
  to,
  name,
  organizationName,
}: SendWelcomeEmailParams) {
  const loginUrl = `${process.env.NEXTAUTH_URL}/auth/signin`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue sur Decidoo</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0 0 20px 0; font-size: 24px;">
            Bienvenue sur Decidoo !
          </h1>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Bonjour ${name},
          </p>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Votre compte a été créé avec succès et vous avez rejoint l'organisation <strong>${organizationName}</strong>.
          </p>
          <p style="margin: 0 0 25px 0; font-size: 16px;">
            Vous pouvez maintenant vous connecter et commencer à participer aux décisions de votre équipe.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}"
               style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
              Se connecter
            </a>
          </div>
        </div>
        <div style="text-align: center; font-size: 12px; color: #999; padding: 20px 0;">
          <p style="margin: 0;">
            Si vous avez des questions, n'hésitez pas à contacter votre administrateur.
          </p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Bonjour ${name},

Votre compte a été créé avec succès et vous avez rejoint l'organisation ${organizationName}.

Vous pouvez maintenant vous connecter et commencer à participer aux décisions de votre équipe.

Pour vous connecter, visitez :
${loginUrl}

Si vous avez des questions, n'hésitez pas à contacter votre administrateur.
  `.trim();

  const emailData = {
    from: fromEmail,
    to: [to],
    subject: `Bienvenue sur Decidoo`,
    html: htmlContent,
    text: textContent,
  };

  // Si RESEND_API_KEY est défini, utiliser Resend
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== '') {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const data = await resend.emails.send(emailData);
      console.log(`✅ Email de bienvenue envoyé à ${to}`);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ Erreur bienvenue pour ${to}:`, error);
    }
  }

  // Mode console
  console.log(`📧 [CONSOLE] Bienvenue à ${to}`);
  console.log(`   Connexion: ${loginUrl}\n`);
  return { success: true, mode: 'console' };
}

interface SendSignupWelcomeEmailParams {
  to: string;
  name: string;
}

export async function sendSignupWelcomeEmail({
  to,
  name,
}: SendSignupWelcomeEmailParams) {
  const loginUrl = `${process.env.NEXTAUTH_URL}/auth/signin`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue sur Decidoo</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0 0 20px 0; font-size: 24px;">
            Bienvenue sur Decidoo !
          </h1>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Bonjour ${name},
          </p>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Votre compte Decidoo a été créé avec succès ! Nous sommes ravis de vous accueillir sur notre plateforme de prise de décision collaborative.
          </p>
          <p style="margin: 0 0 25px 0; font-size: 16px;">
            Vous pouvez maintenant créer votre première organisation ou accepter une invitation pour rejoindre une équipe existante.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}"
               style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
              Commencer maintenant
            </a>
          </div>
        </div>
        <div style="text-align: center; font-size: 12px; color: #999; padding: 20px 0;">
          <p style="margin: 0;">
            Si vous avez des questions, n'hésitez pas à nous contacter.
          </p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Bonjour ${name},

Votre compte Decidoo a été créé avec succès ! Nous sommes ravis de vous accueillir sur notre plateforme de prise de décision collaborative.

Vous pouvez maintenant créer votre première organisation ou accepter une invitation pour rejoindre une équipe existante.

Pour commencer, visitez :
${loginUrl}

Si vous avez des questions, n'hésitez pas à nous contacter.
  `.trim();

  const emailData = {
    from: fromEmail,
    to: [to],
    subject: `Bienvenue sur Decidoo !`,
    html: htmlContent,
    text: textContent,
  };

  // Si RESEND_API_KEY est défini, utiliser Resend
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== '') {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const data = await resend.emails.send(emailData);
      console.log(`✅ Email de bienvenue envoyé à ${to}`);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ Erreur email de bienvenue pour ${to}:`, error);
    }
  }

  // Mode console
  console.log(`📧 [CONSOLE] Bienvenue à ${to}`);
  console.log(`   Connexion: ${loginUrl}\n`);
  return { success: true, mode: 'console' };
}

interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetToken: string;
}

export async function sendPasswordResetEmail({
  to,
  userName,
  resetToken,
}: SendPasswordResetEmailParams) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

  // Date et heure de la demande
  const requestDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const requestTime = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation de votre mot de passe Decidoo</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0 0 20px 0; font-size: 24px;">
            Réinitialisation de votre mot de passe
          </h1>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Bonjour ${userName},
          </p>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Decidoo.
          </p>
          <div style="background-color: #e8f4fd; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">
              <strong>Date de la demande :</strong> ${requestDate} à ${requestTime}
            </p>
            <p style="margin: 0; font-size: 14px; color: #555;">
              <strong>Validité du lien :</strong> 1 heure
            </p>
          </div>
          <p style="margin: 0 0 25px 0; font-size: 16px;">
            Pour définir un nouveau mot de passe, cliquez sur le bouton ci-dessous :
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="margin: 25px 0 0 0; font-size: 14px; color: #666;">
            Ou copiez ce lien dans votre navigateur :
          </p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #2563eb; word-break: break-all;">
            ${resetUrl}
          </p>
        </div>
        <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #856404; font-weight: 600;">
            ⚠️ Informations de sécurité importantes
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #856404;">
            <li style="margin-bottom: 5px;">Ce lien expire dans 1 heure pour votre sécurité.</li>
            <li style="margin-bottom: 5px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email et votre mot de passe restera inchangé.</li>
            <li style="margin-bottom: 5px;">Pour des raisons de sécurité, vous ne pouvez demander qu'un maximum de 2 réinitialisations par heure.</li>
            <li>Ne partagez jamais ce lien avec qui que ce soit.</li>
          </ul>
        </div>
        <div style="text-align: center; font-size: 12px; color: #999; padding: 20px 0;">
          <p style="margin: 0 0 5px 0;">
            Cet email a été envoyé automatiquement par Decidoo.
          </p>
          <p style="margin: 0;">
            Si vous avez des questions, contactez votre administrateur.
          </p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Bonjour ${userName},

Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Decidoo.

Date de la demande : ${requestDate} à ${requestTime}
Validité du lien : 1 heure

Pour définir un nouveau mot de passe, veuillez cliquer sur le lien suivant :
${resetUrl}

⚠️ INFORMATIONS DE SÉCURITÉ IMPORTANTES

- Ce lien expire dans 1 heure pour votre sécurité.
- Si vous n'avez pas demandé cette réinitialisation, ignorez cet email et votre mot de passe restera inchangé.
- Pour des raisons de sécurité, vous ne pouvez demander qu'un maximum de 2 réinitialisations par heure.
- Ne partagez jamais ce lien avec qui que ce soit.

Cet email a été envoyé automatiquement par Decidoo.
Si vous avez des questions, contactez votre administrateur.
  `.trim();

  const emailData = {
    from: fromEmail,
    to: [to],
    subject: `Réinitialisation de votre mot de passe Decidoo`,
    html: htmlContent,
    text: textContent,
  };

  // Si RESEND_API_KEY est défini, utiliser Resend
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== '') {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const data = await resend.emails.send(emailData);
      console.log(`✅ Email de réinitialisation envoyé à ${to}`);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ Erreur réinitialisation pour ${to}:`, error);
    }
  }

  // Mode console
  console.log(`📧 [CONSOLE] Réinitialisation mot de passe à ${to}`);
  console.log(`   Lien: ${resetUrl}\n`);
  return { success: true, mode: 'console' };
}
