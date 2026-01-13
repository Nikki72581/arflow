"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { generatePublicShareLink } from "./public-invoices";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { logInvoiceEmailed, logEmailFailed } from "@/lib/audit-log";

interface SendInvoiceEmailParams {
  documentId: string;
  to: string;
  subject: string;
  message: string;
}

/**
 * Send invoice email with public link
 *
 * Note: This is a placeholder implementation. In production, integrate with:
 * - Resend (recommended for Next.js): https://resend.com
 * - SendGrid: https://sendgrid.com
 * - AWS SES: https://aws.amazon.com/ses/
 * - Postmark: https://postmarkapp.com
 *
 * To implement with Resend:
 * 1. npm install resend
 * 2. Add RESEND_API_KEY to .env
 * 3. import { Resend } from 'resend'
 * 4. const resend = new Resend(process.env.RESEND_API_KEY)
 * 5. Replace the placeholder implementation below
 */
export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check if email service is configured
    if (!isEmailConfigured()) {
      return {
        success: false,
        error: "Email service not configured. Please add RESEND_API_KEY to your environment variables.",
      };
    }

    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Only admins can send invoices" };
    }

    // Get the document
    const document = await prisma.arDocument.findFirst({
      where: {
        id: params.documentId,
        organizationId: user.organizationId,
      },
      include: {
        customer: true,
        organization: true,
      },
    });

    if (!document) {
      return { success: false, error: "Invoice not found" };
    }

    // Only allow sending invoices
    if (document.documentType !== "INVOICE") {
      return { success: false, error: "Only invoices can be emailed" };
    }

    // Generate or get public share link
    let shareUrl: string | null = null;
    if (document.publicShareToken && document.publicShareEnabled) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      shareUrl = `${baseUrl}/invoice/${document.publicShareToken}`;
    } else {
      // Generate a new share link
      const result = await generatePublicShareLink(params.documentId);
      if (result.success && result.shareUrl) {
        shareUrl = result.shareUrl;
      }
    }

    if (!shareUrl) {
      return { success: false, error: "Failed to generate invoice link" };
    }

    // Construct email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${params.subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">${document.organization.name}</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Invoice ${document.documentNumber}</h2>

            <p style="color: #4b5563; white-space: pre-wrap;">${params.message}</p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9333ea;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Invoice Details:</p>
              <p style="margin: 10px 0; font-size: 16px;"><strong>Invoice Number:</strong> ${document.documentNumber}</p>
              <p style="margin: 10px 0; font-size: 16px;"><strong>Amount:</strong> $${document.totalAmount.toFixed(2)}</p>
              <p style="margin: 10px 0; font-size: 16px;"><strong>Balance Due:</strong> $${document.balanceDue.toFixed(2)}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${shareUrl}" style="background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View & Pay Invoice
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              You can also copy and paste this link into your browser:<br>
              <a href="${shareUrl}" style="color: #9333ea; word-break: break-all;">${shareUrl}</a>
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              This is an automated email from ${document.organization.name}.<br>
              ${document.organization.email ? `For questions, contact us at ${document.organization.email}` : ''}
            </p>
          </div>
        </body>
      </html>
    `;

    const emailText = `
${params.message}

Invoice Details:
- Invoice Number: ${document.documentNumber}
- Amount: $${document.totalAmount.toFixed(2)}
- Balance Due: $${document.balanceDue.toFixed(2)}

View and pay your invoice online:
${shareUrl}

---
This is an automated email from ${document.organization.name}.
${document.organization.email ? `For questions, contact us at ${document.organization.email}` : ''}
    `.trim();

    // Send the email using Resend
    const emailResult = await sendEmail({
      to: params.to,
      subject: params.subject,
      html: emailHtml,
      replyTo: document.organization.email || undefined,
    });

    if (!emailResult.success) {
      // Log failed email attempt
      await logEmailFailed({
        invoiceId: document.id,
        invoiceNumber: document.documentNumber,
        recipientEmail: params.to,
        error: emailResult.error || "Unknown error",
        sentBy: {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
        },
        organizationId: user.organizationId,
      });

      return {
        success: false,
        error: emailResult.error || "Failed to send email",
      };
    }

    // Log successful send for audit purposes
    console.log('Invoice email sent successfully:', {
      to: params.to,
      documentNumber: document.documentNumber,
      emailId: emailResult.data?.id,
    });

    // Create audit log entry
    await logInvoiceEmailed({
      invoiceId: document.id,
      invoiceNumber: document.documentNumber,
      recipientEmail: params.to,
      recipientName: document.customer?.name || params.to,
      sentBy: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
      },
      organizationId: user.organizationId,
      emailId: emailResult.data?.id,
    });

    return {
      success: true,
    };

  } catch (error: any) {
    console.error("Error sending invoice email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

/**
 * Test email configuration
 * This can be called to verify email service is properly configured
 */
export async function testEmailConfiguration(testEmailAddress: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true },
    });

    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Only admins can test email configuration" };
    }

    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: "Email service not configured. Please add RESEND_API_KEY to your environment variables.",
      };
    }

    // Send test email
    const result = await sendEmail({
      to: testEmailAddress,
      subject: `Test Email from ${user.organization.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">✓ Email Configuration Test</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin-top: 0;">Success!</h2>
              <p>Your email service is properly configured and working.</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9333ea;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Configuration Details:</p>
                <p style="margin: 10px 0; font-size: 16px;"><strong>Organization:</strong> ${user.organization.name}</p>
                <p style="margin: 10px 0; font-size: 16px;"><strong>From Email:</strong> ${process.env.RESEND_FROM_EMAIL || 'noreply@arflow.app'}</p>
                <p style="margin: 10px 0; font-size: 16px;"><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This is an automated test email from ${user.organization.name}.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to send test email",
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error testing email configuration:", error);
    return { success: false, error: error.message || "Failed to test email configuration" };
  }
}
