import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

// Créer le transporteur email
async function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const emailProvider = process.env.EMAIL_PROVIDER || 'console';

  switch (emailProvider) {
    case 'gmail':
      // Configuration pour Gmail
      // Nécessite un "App Password" si 2FA est activé
      // Guide: https://support.google.com/accounts/answer/185833
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
      console.log('📧 Email configured with Gmail');
      break;

    case 'smtp':
      // Configuration SMTP personnalisée
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true pour port 465, false pour autres ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      console.log(`📧 Email configured with SMTP: ${process.env.SMTP_HOST}`);
      break;

    case 'ethereal':
      // Ethereal Email - Service de test gratuit
      // Les emails ne sont pas vraiment envoyés mais peuvent être visualisés en ligne
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('📧 Email configured with Ethereal (test mode)');
      console.log(`   View emails at: https://ethereal.email/messages`);
      console.log(`   User: ${testAccount.user}`);
      console.log(`   Pass: ${testAccount.pass}`);
      break;

    case 'console':
    default:
      // Mode console - Affiche juste les emails dans les logs
      // Utile pour le développement
      transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      console.log('📧 Email configured in CONSOLE mode (development)');
      console.log('   Emails will be logged to console instead of being sent');
      break;
  }

  return transporter;
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
  const fromEmail = process.env.FROM_EMAIL || 'noreply@decido.app';
  const fromName = process.env.FROM_NAME || 'Decido';

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
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `Invitation à rejoindre ${organizationName} sur Decido`,
      text: textContent,
      html: htmlContent,
    });

    // En mode console, afficher l'email
    if (process.env.EMAIL_PROVIDER === 'console' || !process.env.EMAIL_PROVIDER) {
      console.log('\n📧 ===== EMAIL SENT (CONSOLE MODE) =====');
      console.log(`To: ${to}`);
      console.log(`Subject: Invitation à rejoindre ${organizationName} sur Decido`);
      console.log(`\nInvitation URL: ${invitationUrl}\n`);
      console.log('========================================\n');
    }

    // En mode Ethereal, afficher l'URL de preview
    if (process.env.EMAIL_PROVIDER === 'ethereal') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('\n📧 ===== EMAIL SENT (ETHEREAL TEST) =====');
      console.log(`Preview URL: ${previewUrl}`);
      console.log('=========================================\n');
    }

    return { success: true, messageId: info.messageId };
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
  const fromEmail = process.env.FROM_EMAIL || 'noreply@decido.app';
  const fromName = process.env.FROM_NAME || 'Decido';

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
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: 'Bienvenue sur Decido',
      text: textContent,
      html: htmlContent,
    });

    // En mode console, afficher l'email
    if (process.env.EMAIL_PROVIDER === 'console' || !process.env.EMAIL_PROVIDER) {
      console.log('\n📧 ===== EMAIL SENT (CONSOLE MODE) =====');
      console.log(`To: ${to}`);
      console.log(`Subject: Bienvenue sur Decido`);
      console.log(`\nLogin URL: ${loginUrl}\n`);
      console.log('========================================\n');
    }

    // En mode Ethereal, afficher l'URL de preview
    if (process.env.EMAIL_PROVIDER === 'ethereal') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('\n📧 ===== EMAIL SENT (ETHEREAL TEST) =====');
      console.log(`Preview URL: ${previewUrl}`);
      console.log('=========================================\n');
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}
