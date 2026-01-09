import { formatCurrency, formatDate } from './utils'
import { EMAIL_CONFIG } from './email'

// Base email template wrapper
function getEmailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Commission Notification</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #666;
    }
    .info-value {
      color: #333;
    }
    .amount {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      text-align: center;
      margin: 30px 0;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-approved {
      background-color: #d1fae5;
      color: #065f46;
    }
    .status-paid {
      background-color: #dbeafe;
      color: #1e40af;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 20px;
      }
      .amount {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
  `
}

// Commission Approved Email Template
export function getCommissionApprovedEmail(data: {
  salespersonName: string
  commissionAmount: number
  saleAmount: number
  commissionRate: number
  clientName: string
  projectName: string
  saleDate: Date
  approvedDate: Date
  dashboardUrl: string
}): string {
  const content = `
    <div class="header">
      <h1>✅ Commission Approved!</h1>
    </div>
    <div class="content">
      <p>Hi ${data.salespersonName},</p>
      
      <p>Great news! Your commission has been approved and is ready for payout.</p>
      
      <div class="amount">
        ${formatCurrency(data.commissionAmount)}
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="status-badge status-approved">Approved</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client:</span>
          <span class="info-value">${data.clientName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Project:</span>
          <span class="info-value">${data.projectName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Sale Amount:</span>
          <span class="info-value">${formatCurrency(data.saleAmount)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Commission Rate:</span>
          <span class="info-value">${data.commissionRate.toFixed(2)}%</span>
        </div>
        <div class="info-row">
          <span class="info-label">Sale Date:</span>
          <span class="info-value">${formatDate(data.saleDate)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Approved Date:</span>
          <span class="info-value">${formatDate(data.approvedDate)}</span>
        </div>
      </div>
      
      <p>Your commission will be included in the next payout cycle.</p>
      
      <center>
        <a href="${data.dashboardUrl}" class="button">View My Commissions</a>
      </center>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Keep up the great work! 🎉
      </p>
    </div>
    <div class="footer">
      <p>
        This is an automated notification from ${EMAIL_CONFIG.companyName}<br>
        <a href="${data.dashboardUrl}">View Dashboard</a> • 
        <a href="${EMAIL_CONFIG.companyUrl}">Visit Website</a>
      </p>
    </div>
  `
  
  return getEmailWrapper(content)
}

// Commission Paid Email Template
export function getCommissionPaidEmail(data: {
  salespersonName: string
  commissionAmount: number
  saleAmount: number
  clientName: string
  projectName: string
  saleDate: Date
  paidDate: Date
  dashboardUrl: string
}): string {
  const content = `
    <div class="header">
      <h1>💰 Commission Paid!</h1>
    </div>
    <div class="content">
      <p>Hi ${data.salespersonName},</p>
      
      <p>Your commission has been paid! The payment should appear in your account shortly.</p>
      
      <div class="amount">
        ${formatCurrency(data.commissionAmount)}
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="status-badge status-paid">Paid</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client:</span>
          <span class="info-value">${data.clientName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Project:</span>
          <span class="info-value">${data.projectName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Sale Amount:</span>
          <span class="info-value">${formatCurrency(data.saleAmount)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Sale Date:</span>
          <span class="info-value">${formatDate(data.saleDate)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Payment Date:</span>
          <span class="info-value">${formatDate(data.paidDate)}</span>
        </div>
      </div>
      
      <p>Thank you for your continued excellent performance!</p>
      
      <center>
        <a href="${data.dashboardUrl}" class="button">View Payment Details</a>
      </center>
    </div>
    <div class="footer">
      <p>
        This is an automated notification from ${EMAIL_CONFIG.companyName}<br>
        <a href="${data.dashboardUrl}">View Dashboard</a> • 
        <a href="${EMAIL_CONFIG.companyUrl}">Visit Website</a>
      </p>
    </div>
  `
  
  return getEmailWrapper(content)
}

// Bulk Payout Summary Email Template
export function getBulkPayoutSummaryEmail(data: {
  salespersonName: string
  totalAmount: number
  commissionsCount: number
  paidDate: Date
  commissions: Array<{
    amount: number
    clientName: string
    projectName: string
  }>
  dashboardUrl: string
}): string {
  const commissionsHtml = data.commissions
    .map(
      (c) => `
      <div class="info-row">
        <span class="info-label">${c.clientName} - ${c.projectName}</span>
        <span class="info-value">${formatCurrency(c.amount)}</span>
      </div>
    `
    )
    .join('')

  const content = `
    <div class="header">
      <h1>💰 Batch Payout Processed!</h1>
    </div>
    <div class="content">
      <p>Hi ${data.salespersonName},</p>
      
      <p>We've processed a batch payout including ${data.commissionsCount} of your commissions.</p>
      
      <div class="amount">
        ${formatCurrency(data.totalAmount)}
      </div>
      
      <div style="text-align: center; color: #666; margin: 10px 0 30px;">
        ${data.commissionsCount} commission${data.commissionsCount !== 1 ? 's' : ''} paid on ${formatDate(data.paidDate)}
      </div>
      
      <div class="info-box">
        <h3 style="margin-top: 0;">Commissions Included:</h3>
        ${commissionsHtml}
      </div>
      
      <p>The payment should appear in your account shortly.</p>
      
      <center>
        <a href="${data.dashboardUrl}" class="button">View All Payments</a>
      </center>
    </div>
    <div class="footer">
      <p>
        This is an automated notification from ${EMAIL_CONFIG.companyName}<br>
        <a href="${data.dashboardUrl}">View Dashboard</a> • 
        <a href="${EMAIL_CONFIG.companyUrl}">Visit Website</a>
      </p>
    </div>
  `
  
  return getEmailWrapper(content)
}
