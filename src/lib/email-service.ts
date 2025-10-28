import nodemailer from 'nodemailer';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Interface for single comparison failure data
interface ComparisonFailureData {
  pageName: string;
  pagePath: string;
  pageUrl: string;
  websiteName: string;
  websiteUrl: string;
  errorMessage: string;
  timestamp: Date;
}

// Interface for bulk comparison failure data
interface BulkComparisonFailureData {
  websiteName: string;
  websiteUrl: string;
  totalPages: number;
  failedPages: Array<{
    pageName: string;
    pagePath: string;
    errorMessage: string;
  }>;
  successfulPages: number;
  timestamp: Date;
}

interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Email service for sending notifications about failed checks
 */
class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@website-compare.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Website Compare';

    // Create nodemailer transporter
    this.transporter = this.createTransporter();
  }

  private createTransporter(): nodemailer.Transporter {
    const provider = process.env.EMAIL_PROVIDER || 'smtp';

    switch (provider) {
      case 'sendgrid':
        return nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });

      default: // SMTP
        return nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'localhost',
          port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
    }
  }

  /**
   * Send a generic email
   */
  private async sendEmail(
    recipients: EmailRecipient[],
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<void> {
    const mailOptions = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', '),
      subject,
      html: htmlContent,
      text: textContent,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${recipients.length} recipients`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send email notification for single comparison failure
   */
  async sendComparisonFailureNotification(
    recipients: EmailRecipient[],
    data: ComparisonFailureData
  ): Promise<void> {
    const subject = `🚨 Comparison Failed: ${data.pageName} - ${data.websiteName}`;
    
    const htmlContent = this.generateComparisonFailureHtml(data);
    const textContent = this.generateComparisonFailureText(data);

    await this.sendEmail(recipients, subject, htmlContent, textContent);
  }

  /**
   * Send email notification for bulk comparison failures
   */
  async sendBulkComparisonFailureNotification(
    recipients: EmailRecipient[],
    data: BulkComparisonFailureData
  ): Promise<void> {
    const subject = `🚨 Bulk Comparison Issues: ${data.websiteName} (${data.failedPages.length}/${data.totalPages} failed)`;
    
    const htmlContent = this.generateBulkComparisonFailureHtml(data);
    const textContent = this.generateBulkComparisonFailureText(data);

    await this.sendEmail(recipients, subject, htmlContent, textContent);
  }

  /**
   * Generate HTML content for single comparison failure
   */
  private generateComparisonFailureHtml(data: ComparisonFailureData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comparison Failed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background-color: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
          .error-box { background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .info-table th, .info-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
          .info-table th { background-color: #f3f4f6; font-weight: bold; }
          .button { display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 Comparison Failed</h1>
          <p>A website comparison has failed and requires attention.</p>
        </div>
        
        <div class="content">
          <table class="info-table">
            <tr>
              <td><strong>Page:</strong></td>
              <td>${data.pageName}</td>
            </tr>
            <tr>
              <td><strong>Website:</strong></td>
              <td>${data.websiteName}</td>
            </tr>
            <tr>
              <td><strong>URL:</strong></td>
              <td><a href="${data.pageUrl}">${data.pageUrl}</a></td>
            </tr>
            <tr>
              <td><strong>Time:</strong></td>
              <td>${data.timestamp.toLocaleString()}</td>
            </tr>
          </table>

          <div class="error-box">
            <h3>❌ Error Details</h3>
            <p><code>${data.errorMessage}</code></p>
          </div>

          <p>This error occurred while trying to take a screenshot and compare it with the baseline. Common causes include:</p>
          <ul>
            <li>Network connectivity issues</li>
            <li>Page loading timeouts</li>
            <li>Website authentication problems</li>
            <li>Server errors or maintenance</li>
          </ul>
          
          <a href="${data.websiteUrl}" class="button">View Website Dashboard</a>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from Website Compare. You're receiving this because you have edit permissions for this website.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for single comparison failure
   */
  private generateComparisonFailureText(data: ComparisonFailureData): string {
    return `
🚨 COMPARISON FAILED

A screenshot comparison has failed for one of your monitored pages.

Page: ${data.pageName}
Website: ${data.websiteName}
URL: ${data.pageUrl}
Time: ${data.timestamp.toLocaleString()}

ERROR DETAILS:
${data.errorMessage}

This error occurred while trying to take a screenshot and compare it with the baseline. Common causes include network connectivity issues, page loading timeouts, website authentication problems, or server errors.

View Website Dashboard: ${data.websiteUrl}

---
This is an automated notification from Website Compare.
    `.trim();
  }

  /**
   * Generate HTML content for bulk comparison failure
   */
  private generateBulkComparisonFailureHtml(data: BulkComparisonFailureData): string {
    const failedPagesHtml = data.failedPages.map(page => `
      <tr>
        <td>${page.pageName}</td>
        <td>${page.pagePath}</td>
        <td><code>${page.errorMessage}</code></td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bulk Comparison Issues</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background-color: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
          .summary-box { background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .success-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .info-table th, .info-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
          .info-table th { background-color: #f3f4f6; font-weight: bold; }
          .failed-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }
          .failed-table th, .failed-table td { padding: 8px; border: 1px solid #e5e7eb; text-align: left; }
          .failed-table th { background-color: #fef2f2; }
          .button { display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 Bulk Comparison Issues</h1>
          <p>Some pages failed during bulk comparison for ${data.websiteName}</p>
        </div>
        
        <div class="content">
          <table class="info-table">
            <tr>
              <td><strong>Website:</strong></td>
              <td>${data.websiteName}</td>
            </tr>
            <tr>
              <td><strong>Total Pages:</strong></td>
              <td>${data.totalPages}</td>
            </tr>
            <tr>
              <td><strong>Time:</strong></td>
              <td>${data.timestamp.toLocaleString()}</td>
            </tr>
          </table>

          <div class="summary-box">
            <h3>❌ Failed: ${data.failedPages.length} pages</h3>
          </div>

          ${data.successfulPages > 0 ? `
          <div class="success-box">
            <h3>✅ Successful: ${data.successfulPages} pages</h3>
          </div>
          ` : ''}

          <h3>Failed Pages Details:</h3>
          <table class="failed-table">
            <thead>
              <tr>
                <th>Page Name</th>
                <th>Path</th>
                <th>Error Message</th>
              </tr>
            </thead>
            <tbody>
              ${failedPagesHtml}
            </tbody>
          </table>

          <p>Please review the failed pages and check their configuration. You may need to update URLs, fix network issues, or resolve other technical problems.</p>
          
          <a href="${data.websiteUrl}" class="button">View Website Dashboard</a>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from Website Compare. You're receiving this because you have edit permissions for this website.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for bulk comparison failure
   */
  private generateBulkComparisonFailureText(data: BulkComparisonFailureData): string {
    const failedPagesText = data.failedPages.map(page => 
      `- ${page.pageName} (${page.pagePath}): ${page.errorMessage}`
    ).join('\n');

    return `
🚨 BULK COMPARISON ISSUES

Some pages failed during bulk comparison for ${data.websiteName}

Website: ${data.websiteName}
Total Pages: ${data.totalPages}
Failed Pages: ${data.failedPages.length}
Successful Pages: ${data.successfulPages}
Time: ${data.timestamp.toLocaleString()}

FAILED PAGES:
${failedPagesText}

Please review the failed pages and check their configuration. You may need to update URLs, fix network issues, or resolve other technical problems.

View Website Dashboard: ${data.websiteUrl}

---
This is an automated notification from Website Compare.
    `.trim();
  }
}

// Export a singleton instance
export const emailService = new EmailService();

// Export types for use in other modules
export type { ComparisonFailureData, BulkComparisonFailureData, EmailRecipient };