import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@decido.app';

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
            Invitation à rejoindre Decido
          </h1>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Bonjour ${firstName} ${lastName},
          </p>
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            <strong>${invitedByName}</strong> vous a invité à rejoindre l'organisation <strong>${organizationName}</strong> sur Decido.
          </p>
          <p style="margin: 0 0 25px 0; font-size: 16px;">
            Decido est une plateforme collaborative de prise de décision qui permet aux équipes de voter et de prendre des décisions ensemble de manière transparente et démocratique.
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

${invitedByName} vous a invité à rejoindre l'organisation ${organizationName} sur Decido.

Decido est une plateforme collaborative de prise de décision qui permet aux équipes de voter et de prendre des décisions ensemble de manière transparente et démocratique.

Pour accepter cette invitation, veuillez cliquer sur le lien suivant :
${invitationUrl}

Cette invitation expirera dans 7 jours.

Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
  `.trim();

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Invitation à rejoindre ${organizationName} sur Decido`,
      html: htmlContent,
      text: textContent,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
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
        <title>Bienvenue sur Decido</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0 0 20px 0; font-size: 24px;">
            Bienvenue sur Decido !
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

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Bienvenue sur Decido`,
      html: htmlContent,
      text: textContent,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}
