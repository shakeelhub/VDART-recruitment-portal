import nodemailer from 'nodemailer';
import { generateDeploymentEmailTemplate } from '../utils/deploymentEmailTemplate.js';
import { generateInternalTransferEmailTemplate } from '../utils/internalTransferEmailTemplate.js';
import Employee from '../schema/Employee.js';

// ✅ NEW: Portal email mapping for candidate transfer notifications
const PORTAL_EMAILS = {
  'HR TAG': 'sachin.s@vdartinc.com',
  'HR OPS': 'venghadakrishnan.t@vdartinc.com',
  'ADMIN': 'sabaresh.r@vdartinc.com',
  'L&D': 'allwin.f@vdartinc.com',
  'DELIVERY': 'saranraj.s@vdartinc.com'
};

class EmailService {
  
  // ✅ EXISTING: Dynamic transporter creation - NO CHANGES
  async createDynamicTransporter() {
    try {
      const manager = await Employee.findOne({
        team: 'Delivery',
        isDeliveryManager: true,
        isActive: true,
        canSendEmail: true
      }).select('managerEmailConfig name');

      if (!manager || !manager.managerEmailConfig) {
        throw new Error('No active delivery manager found with email permissions');
      }

      const { email, appPassword } = manager.managerEmailConfig;

      if (!email || !appPassword) {
        throw new Error('Manager email credentials are incomplete');
      }

      const transporter = nodemailer.createTransporter({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: email,
          pass: appPassword
        },
        tls: { rejectUnauthorized: false }
      });

      await transporter.verify();
      
      return {
        transporter,
        managerInfo: {
          email,
          name: manager.name
        }
      };

    } catch (error) {
      console.error('❌ Dynamic transporter creation failed:', error.message);
      throw new Error(`Email configuration error: ${error.message}`);
    }
  }

  // ✅ EXISTING: Deployment email function - NO CHANGES
  async sendDeploymentEmail(formData, recipientEmails, ccEmails = [], subject = '', content = '', senderEmpId, managerDetails = {}) {
    try {
      console.log('📧 EMAIL SERVICE STARTED');
      console.log('📧 Received parameters:', {
        hasFormData: !!formData,
        recipientCount: recipientEmails?.length,
        ccCount: ccEmails?.length,
        senderEmpId,
        managerDetails
      });
      console.log('📧 FormData details:', formData);

      console.log('📧 About to query sender employee');
      const sender = await Employee.findOne({
        empId: senderEmpId,
        team: 'Delivery',
        isActive: true,
        canSendEmail: true
      });

      console.log('📧 Sender query result:', sender ? 'Found' : 'Not found');

      if (!sender) {
        console.log('📧 SENDER VALIDATION FAILED');
        throw new Error('Sender does not have email permissions or is not active');
      }

      console.log('📧 About to create dynamic transporter');
      const { transporter, managerInfo } = await this.createDynamicTransporter();
      console.log('📧 Transporter created successfully for:', managerInfo.email);
      
      console.log('📧 About to call generateDeploymentEmailTemplate');
      console.log('📧 Template parameters:', {
        formDataKeys: Object.keys(formData || {}),
        managerDetailsKeys: Object.keys(managerDetails || {}),
        contentLength: content?.length || 0
      });

      // ✅ FIXED: Pass managerDetails to template function
      const html = generateDeploymentEmailTemplate(formData, managerDetails, content);
      
      console.log('📧 Template generated successfully, HTML length:', html?.length || 0);
      console.log('📧 HTML preview (first 200 chars):', html?.substring(0, 200));

      console.log('📧 About to send emails to recipients:', recipientEmails);
      
      const emailPromises = recipientEmails.map(async (email) => {
        const mailOptions = {
          from: `${managerInfo.name} - Delivery Department <${managerInfo.email}>`,
          to: email.trim(),
          subject: subject.trim() || 'Employee Deployment Notice',
          html: html
        };

        if (ccEmails && ccEmails.length > 0) {
          const validCcEmails = ccEmails.filter(cc => cc && cc.trim());
          if (validCcEmails.length > 0) {
            mailOptions.cc = validCcEmails.join(', ');
          }
        }

        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${email} from ${managerInfo.email}:`, result.messageId);
        return { email, success: true, messageId: result.messageId };
      });

      console.log('📧 About to execute email promises');
      const results = await Promise.allSettled(emailPromises);
      console.log('📧 Email promises completed');
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log('📧 Email results:', { successful, failed, total: recipientEmails.length });

      return {
        success: true,
        message: 'Deployment email sent successfully',
        data: {
          total: recipientEmails.length,
          successful,
          failed,
          sentFrom: managerInfo.email,
          senderName: managerInfo.name,
          results: results.map(r => ({
            success: r.status === 'fulfilled',
            data: r.value || null,
            error: r.reason || null
          }))
        }
      };
    } catch (error) {
      console.error('📧📧📧 EMAIL SERVICE ERROR:', error);
      console.error('📧📧📧 ERROR STACK:', error.stack);
      console.error('📧📧📧 ERROR MESSAGE:', error.message);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  // ✅ EXISTING: Internal transfer email function - NO CHANGES
  async sendInternalTransferEmail(formData, recipientEmails, ccEmails = [], subject = '', content = '', senderEmpId, managerDetails = {}) {
    try {
      console.log('📨 INTERNAL TRANSFER EMAIL SERVICE STARTED');
      console.log('📨 Received parameters:', {
        hasFormData: !!formData,
        recipientCount: recipientEmails?.length,
        senderEmpId,
        managerDetails
      });

      const sender = await Employee.findOne({
        empId: senderEmpId,
        team: 'Delivery',
        isActive: true,
        canSendEmail: true
      });

      console.log('📨 Internal transfer sender found:', sender ? 'Yes' : 'No');

      if (!sender) {
        throw new Error('Sender does not have email permissions or is not active');
      }

      const { transporter, managerInfo } = await this.createDynamicTransporter();
      
      console.log('📨 About to call generateInternalTransferEmailTemplate');
      // ✅ FIXED: Pass managerDetails to template function
      const html = generateInternalTransferEmailTemplate(formData, managerDetails, content);
      console.log('📨 Internal transfer template generated, HTML length:', html?.length || 0);
      
      const emailPromises = recipientEmails.map(async (email) => {
        const mailOptions = {
          from: `${managerInfo.name} - Delivery Department <${managerInfo.email}>`,
          to: email.trim(),
          subject: subject.trim() || 'Internal Transfer Notice',
          html: html
        };

        if (ccEmails && ccEmails.length > 0) {
          const validCcEmails = ccEmails.filter(cc => cc && cc.trim());
          if (validCcEmails.length > 0) {
            mailOptions.cc = validCcEmails.join(', ');
          }
        }

        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Transfer email sent to ${email} from ${managerInfo.email}:`, result.messageId);
        return { email, success: true, messageId: result.messageId };
      });

      const results = await Promise.allSettled(emailPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: true,
        message: 'Internal transfer email sent successfully',
        data: {
          total: recipientEmails.length,
          successful,
          failed,
          sentFrom: managerInfo.email,
          senderName: managerInfo.name,
          results: results.map(r => ({
            success: r.status === 'fulfilled',
            data: r.value || null,
            error: r.reason || null
          }))
        }
      };
    } catch (error) {
      console.error('📨📨📨 INTERNAL TRANSFER EMAIL SERVICE ERROR:', error);
      console.error('📨📨📨 ERROR STACK:', error.stack);
      throw new Error(`Transfer email sending failed: ${error.message}`);
    }
  }

  // ✅ NEW: Candidate transfer notification function
  async sendCandidateTransferNotification(fromPortal, toPortal, candidateCount, transferPurpose, senderEmpId) {
    try {
      console.log('📬 CANDIDATE TRANSFER NOTIFICATION STARTED');
      console.log('📬 Transfer details:', { fromPortal, toPortal, candidateCount, transferPurpose });

      // Get receiving portal email(s)
      let recipientEmails = [];
      
      if (Array.isArray(toPortal)) {
        // Multiple portals (e.g., Admin & L&D)
        recipientEmails = toPortal.map(portal => PORTAL_EMAILS[portal]).filter(email => email);
      } else {
        // Single portal
        const email = PORTAL_EMAILS[toPortal];
        if (email) {
          recipientEmails = [email];
        }
      }

      if (recipientEmails.length === 0) {
        throw new Error(`No email found for portal(s): ${Array.isArray(toPortal) ? toPortal.join(', ') : toPortal}`);
      }

      // Verify sender permissions (reuse existing logic)
      const sender = await Employee.findOne({
        empId: senderEmpId,
        isActive: true
      });

      if (!sender) {
        throw new Error('Sender does not have permissions to send candidate transfer notifications');
      }

      // Get transporter (reuse existing logic)
      const { transporter, managerInfo } = await this.createDynamicTransporter();
      
      // Create email content
      const portalDisplayName = Array.isArray(toPortal) ? toPortal.join(' & ') : toPortal;
      const subject = `${candidateCount} Candidate${candidateCount > 1 ? 's' : ''} Received from ${fromPortal}`;
      
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Candidate Transfer Notification</title>
          <style>
              body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 20px;
                  background-color: #f8f9fa;
              }
              .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background-color: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  overflow: hidden;
              }
              .header { 
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white; 
                  padding: 30px; 
                  text-align: center; 
              }
              .header h1 {
                  margin: 0;
                  font-size: 24px;
                  font-weight: 600;
                  margin-bottom: 8px;
              }
              .header p {
                  margin: 0;
                  font-size: 16px;
                  opacity: 0.9;
              }
              .content { 
                  padding: 35px; 
                  text-align: center;
              }
              .notification-box {
                  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                  color: white;
                  padding: 25px;
                  border-radius: 12px;
                  margin: 20px 0;
                  box-shadow: 0 4px 15px rgba(240, 147, 251, 0.3);
              }
              .count-display {
                  font-size: 48px;
                  font-weight: bold;
                  margin-bottom: 10px;
                  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
              }
              .transfer-details {
                  background-color: #f8f9fa;
                  border: 2px solid #e9ecef;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 20px 0;
              }
              .transfer-details h3 {
                  color: #495057;
                  margin: 0 0 15px 0;
                  font-size: 18px;
              }
              .transfer-info {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin: 10px 0;
                  padding: 10px;
                  background-color: white;
                  border-radius: 6px;
                  border: 1px solid #dee2e6;
              }
              .transfer-label {
                  font-weight: 600;
                  color: #6c757d;
              }
              .transfer-value {
                  font-weight: bold;
                  color: #495057;
              }
              .action-required {
                  background-color: #fff3cd;
                  border: 1px solid #ffeaa7;
                  color: #856404;
                  padding: 15px;
                  border-radius: 8px;
                  margin: 20px 0;
                  font-weight: 500;
              }
              .signature-container {
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 2px solid #e9ecef;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🚀 Candidate Notification</h1>
                  <p>New candidates have been received for your team</p>
              </div>
              
              <div class="content">
                  <div class="notification-box">
                      <div class="count-display">${candidateCount}</div>
                      <p style="margin: 0; font-size: 18px; font-weight: 500;">
                          Candidate${candidateCount > 1 ? 's' : ''} Received
                      </p>
                  </div>

                  <div class="transfer-details">
                      <h3>📋 Transfer Details</h3>
                      
                      <div class="transfer-info">
                          <span class="transfer-label">From Portal:</span>
                          <span class="transfer-value">${fromPortal}</span>
                      </div>
                      
                      <div class="transfer-info">
                          <span class="transfer-label">To Portal:</span>
                          <span class="transfer-value">${portalDisplayName}</span>
                      </div>
                      
                      <div class="transfer-info">
                          <span class="transfer-label">Purpose:</span>
                          <span class="transfer-value">${transferPurpose}</span>
                      </div>
                      
                      <div class="transfer-info">
                          <span class="transfer-label">Received Date:</span>
                          <span class="transfer-value">${new Date().toLocaleDateString('en-IN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</span>
                      </div>
                  </div>

                  <div class="action-required">
                      ⚡ <strong>Action Required:</strong> Please log into your dashboard to review and process the newly received candidates.
                  </div>

                  <div class="signature-container">
                      ${this.generateTransferEmailSignature()}
                  </div>
              </div>
          </div>
      </body>
      </html>
      `;

      // Send emails to all recipients
      const emailPromises = recipientEmails.map(async (email) => {
        const mailOptions = {
          from: `${managerInfo.name} - HR Department <${managerInfo.email}>`,
          to: email.trim(),
          subject: subject,
          html: htmlContent
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Transfer notification sent to ${email}:`, result.messageId);
        return { email, success: true, messageId: result.messageId };
      });

      const results = await Promise.allSettled(emailPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log('📬 Transfer notification results:', { successful, failed, total: recipientEmails.length });

      return {
        success: true,
        message: 'Candidate transfer notification sent successfully',
        data: {
          total: recipientEmails.length,
          successful,
          failed,
          sentFrom: managerInfo.email,
          recipients: recipientEmails
        }
      };

    } catch (error) {
      console.error('📬📬📬 TRANSFER NOTIFICATION ERROR:', error);
      throw new Error(`Transfer notification failed: ${error.message}`);
    }
  }

  // ✅ NEW: Helper method for transfer email signature
  generateTransferEmailSignature() {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #666; text-align: center; padding: 20px; border-top: 1px solid #e9ecef;">
        <p style="margin: 0; font-weight: bold; color: #495057;">VDART HR Management System</p>
        <p style="margin: 5px 0 0 0; font-size: 12px;">Automated candidate transfer notification</p>
        <p style="margin: 10px 0 0 0; font-size: 12px;">
          📧 This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    `;
  }

  // ✅ EXISTING: Test email config function - NO CHANGES
  async testEmailConfig() {
    try {
      const { transporter, managerInfo } = await this.createDynamicTransporter();
      console.log(`✅ Email config valid for ${managerInfo.email}`);
      return {
        success: true,
        message: `Email configuration valid for ${managerInfo.name} (${managerInfo.email})`
      };
    } catch (error) {
      console.error('❌ Email config test failed:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

const emailService = new EmailService();
export default emailService;