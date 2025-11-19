import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { page, message, organizationSlug } = body;

    if (!message || message.trim() === "") {
      return Response.json(
        { error: "Le message est requis" },
        { status: 400 }
      );
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const userName = user.name || "Utilisateur inconnu";

    // Get organization details if provided
    let organizationName = "N/A";
    if (organizationSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: organizationSlug },
        select: { name: true },
      });
      if (org) {
        organizationName = org.name;
      }
    }

    // Format current time
    const now = new Date();
    const formattedDate = now.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const formattedTime = now.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const sentAt = `${formattedDate} à ${formattedTime}`;

    // Prepare email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Feedback / Bug Report - Decidoo</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin: 0 0 20px 0; font-size: 24px;">
              Nouveau feedback / bug report
            </h1>

            <div style="background-color: white; border-radius: 6px; padding: 20px; margin-bottom: 15px;">
              <h2 style="margin: 0 0 15px 0; font-size: 16px; color: #555; font-weight: 600;">
                Informations utilisateur
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #666; width: 120px;">Nom :</td>
                  <td style="padding: 8px 0;">${userName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #666;">Email :</td>
                  <td style="padding: 8px 0;">${user.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #666;">Organisation :</td>
                  <td style="padding: 8px 0;">${organizationName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #666;">Heure d'envoi :</td>
                  <td style="padding: 8px 0;">${sentAt}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: white; border-radius: 6px; padding: 20px; margin-bottom: 15px;">
              <h2 style="margin: 0 0 15px 0; font-size: 16px; color: #555; font-weight: 600;">
                Page concernée
              </h2>
              <p style="margin: 0; font-family: monospace; font-size: 13px; color: #2563eb; word-break: break-all;">
                ${page || "Non spécifiée"}
              </p>
            </div>

            <div style="background-color: white; border-radius: 6px; padding: 20px;">
              <h2 style="margin: 0 0 15px 0; font-size: 16px; color: #555; font-weight: 600;">
                Message
              </h2>
              <p style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #333;">
${message}
              </p>
            </div>
          </div>

          <div style="text-align: center; font-size: 12px; color: #999; padding: 20px 0;">
            <p style="margin: 0;">
              Cet email a été envoyé automatiquement depuis Decidoo
            </p>
          </div>
        </body>
      </html>
    `;

    const textContent = `
NOUVEAU FEEDBACK / BUG REPORT - DECIDOO

INFORMATIONS UTILISATEUR
------------------------
Nom : ${userName}
Email : ${user.email}
Organisation : ${organizationName}
Heure d'envoi : ${sentAt}

PAGE CONCERNÉE
--------------
${page || "Non spécifiée"}

MESSAGE
-------
${message}

---
Cet email a été envoyé automatiquement depuis Decidoo
    `.trim();

    // Send email
    await sendEmail({
      to: "martin.werlen@gmail.com",
      subject: `[Decidoo] Feedback/Bug - ${userName}`,
      html: htmlContent,
      text: textContent,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error sending feedback:", error);
    return Response.json(
      { error: "Erreur lors de l'envoi du feedback" },
      { status: 500 }
    );
  }
}
