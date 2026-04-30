// Email service abstraction for sending notifications
// This can be extended to support multiple email providers

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export class EmailService {
  private static fromEmail = process.env.EMAIL_FROM || 'noreply@ams.local';

  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // In development/test environments, just log the email
      if (process.env.NODE_ENV !== 'production') {
        console.log('[EMAIL - DEV MODE]', {
          to: options.to,
          subject: options.subject,
          from: options.from || this.fromEmail,
          timestamp: new Date().toISOString(),
        });
        return true;
      }

      // Production: send via email provider
      // This is a placeholder - integrate with SendGrid, AWS SES, Mailgun, etc.
      console.log('[EMAIL - PRODUCTION]', {
        to: options.to,
        subject: options.subject,
        from: options.from || this.fromEmail,
        timestamp: new Date().toISOString(),
      });

      // TODO: Integrate with actual email provider
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({
      //   to: options.to,
      //   from: options.from || this.fromEmail,
      //   subject: options.subject,
      //   html: options.html,
      //   text: options.text,
      // });

      return true;
    } catch (error) {
      console.error('[EMAIL ERROR]', error);
      return false;
    }
  }

  static buildWarrantyExpiryEmailHtml(assetTag: string, assetName: string, expiryDate: Date): string {
    const formattedDate = expiryDate.toLocaleDateString();
    return `
      <h2>Warranty Expiry Reminder</h2>
      <p>Asset <strong>${assetTag}</strong> (${assetName}) has a warranty expiring on <strong>${formattedDate}</strong>.</p>
      <p>Please consider extending the warranty or scheduling maintenance before the warranty expires.</p>
      <p>Log in to the Asset Management System to view details.</p>
    `;
  }

  static buildLicenseExpiryEmailHtml(licenseName: string, licenseVendor: string, expiryDate: Date): string {
    const formattedDate = expiryDate.toLocaleDateString();
    return `
      <h2>License Expiry Reminder</h2>
      <p>License <strong>${licenseName}</strong> from ${licenseVendor} expires on <strong>${formattedDate}</strong>.</p>
      <p>Please consider renewing the license before expiry.</p>
      <p>Log in to the Asset Management System to renew the license.</p>
    `;
  }

  static buildMaintenanceScheduledEmailHtml(assetTag: string, assetName: string, serviceDate: Date): string {
    const formattedDate = serviceDate.toLocaleDateString();
    return `
      <h2>Maintenance Scheduled</h2>
      <p>Maintenance for asset <strong>${assetTag}</strong> (${assetName}) is scheduled for <strong>${formattedDate}</strong>.</p>
      <p>Please ensure the asset is available for maintenance on the scheduled date.</p>
      <p>Log in to the Asset Management System for more details.</p>
    `;
  }

  static buildAssetAssignedEmailHtml(assetTag: string, assetName: string, employeeName: string): string {
    return `
      <h2>Asset Assignment Notification</h2>
      <p>Asset <strong>${assetTag}</strong> (${assetName}) has been assigned to <strong>${employeeName}</strong>.</p>
      <p>Please acknowledge receipt and confirm asset condition.</p>
      <p>Log in to the Asset Management System to view details.</p>
    `;
  }
}

export default EmailService;
