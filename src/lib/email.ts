import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Email configuration
export const EMAIL_CONFIG = {
  from: process.env.RESEND_FROM_EMAIL || 'noreply@arflow.app',
  replyTo: process.env.RESEND_REPLY_TO_EMAIL,
  companyName: process.env.COMPANY_NAME || 'ARFlow',
  companyUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://arflow.app',
}

export { resend }

// Check if email service is configured
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

// Get email configuration status with details
export function getEmailConfigStatus(): {
  configured: boolean
  apiKeyPresent: boolean
  fromEmail: string
  replyToEmail?: string
  missingConfig: string[]
} {
  const missingConfig: string[] = []

  if (!process.env.RESEND_API_KEY) {
    missingConfig.push('RESEND_API_KEY')
  }

  return {
    configured: missingConfig.length === 0,
    apiKeyPresent: !!process.env.RESEND_API_KEY,
    fromEmail: EMAIL_CONFIG.from,
    replyToEmail: EMAIL_CONFIG.replyTo,
    missingConfig,
  }
}

// Email sending function with error handling
export async function sendEmail(params: {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo || EMAIL_CONFIG.replyTo,
    })

    if (error) {
      console.error('Email sending error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email sending exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}
