import nodemailer from "nodemailer";
import logger from "../utils/logger.js";

/**
 * Email Service
 * Handles email sending using nodemailer with Gmail SMTP
 * Provides email templates for password reset, email verification, and task assignments
 */

/**
 * Create nodemailer transporter with Gmail SMTP configuration
 * @returns {nodemailer.Transporter} Configured transporter instance
 */
const createTransporter = () => {
  try {
    // Validate required environment variables
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      throw new Error(
        "Missing required SMTP configuration in environment variables"
      );
    }

    const smtpPort = parseInt(process.env.SMTP_PORT, 10);
    const isSecure = smtpPort === 465;

    const transporter = nodemailer.createTransport({
      service: "gmail", // Use Gmail service for better compatibility
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: isSecure, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Connection timeout
      connectionTimeout: 10000, // 10 seconds
      // Socket timeout
      greetingTimeout: 10000, // 10 seconds
      socketTimeout: 10000, // 10 seconds
      // Retry configuration
      pool: true, // Enable connection pooling for better performance
      maxConnections: 5,
      maxMessages: 100,
      // TLS options for Gmail
      tls: {
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
      },
      // Disable debug output in production
      debug: false,
      logger: false,
    });

    logger.info("Email transporter initialized successfully");

    return transporter;
  } catch (error) {
    logger.error("Failed to create email transporter", {
      error: error.message,
    });
    throw error;
  }
};

// Lazy-load transporter instance (created on first use)
let transporter = null;

/**
 * Get or create transporter instance
 * @returns {nodemailer.Transporter} Configured transporter instance
 */
const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Send email with error handling
 * @param {Object} mailOptions - Email options (from, to, subject, html, text)
 * @returns {Promise<Object>} Email send result
 * @throws {Error} If email sending fails
 */
const sendEmail = async (mailOptions) => {
  try {
    logger.info("Attempting to send email", {
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const info = await getTransporter().sendMail(mailOptions);

    logger.info("Email sent successfully", {
      messageId: info.messageId,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    logger.error("Failed to send email", {
      error: error.message,
      stack: error.stack,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    // Return error object instead of throwing to allow graceful handling
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Email template for password reset
 * @param {string} recipientEmail - Recipient email address
 * @param {string} recipientName - Recipient full name
 * @param {string} resetUrl - Password reset URL
 * @returns {Promise<Object>} Email send result
 */
export const sendPasswordResetEmail = async (
  recipientEmail,
  recipientName,
  resetUrl
) => {
  const appName = process.env.APP_NAME || "Task Manager";
  const fromEmail = process.env.SMTP_USER;

  const mailOptions = {
    from: `"${appName}" <${fromEmail}>`,
    to: recipientEmail,
    subject: `Password Reset Request - ${appName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #1976d2;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #1976d2;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${appName}</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello ${recipientName},</p>
            <p>We received a request to reset your password. Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #1976d2;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0;">
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password will remain unchanged</li>
              </ul>
            </div>
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>${appName} Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Request - ${appName}

      Hello ${recipientName},

      We received a request to reset your password. Click the link below to reset your password:

      ${resetUrl}

      Security Notice:
      - This link will expire in 1 hour
      - If you didn't request this, please ignore this email
      - Your password will remain unchanged

      If you have any questions, please contact our support team.

      Best regards,
      ${appName} Team

      This is an automated email. Please do not reply to this message.
    `,
  };

  return await sendEmail(mailOptions);
};

/**
 * Email template for email verification
 * @param {string} recipientEmail - Recipient email address
 * @param {string} recipientName - Recipient full name
 * @param {string} verificationUrl - Email verification URL
 * @returns {Promise<Object>} Email send result
 */
export const sendEmailVerificationEmail = async (
  recipientEmail,
  recipientName,
  verificationUrl
) => {
  const appName = process.env.APP_NAME || "Task Manager";
  const fromEmail = process.env.SMTP_USER;

  const mailOptions = {
    from: `"${appName}" <${fromEmail}>`,
    to: recipientEmail,
    subject: `Verify Your Email - ${appName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #1976d2;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #1976d2;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .info {
              background-color: #d1ecf1;
              border-left: 4px solid #0c5460;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${appName}</h1>
          </div>
          <div class="content">
            <h2>Welcome to ${appName}!</h2>
            <p>Hello ${recipientName},</p>
            <p>Thank you for registering with ${appName}. To complete your registration, please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #1976d2;">${verificationUrl}</p>
            <div class="info">
              <strong>ℹ️ Important:</strong>
              <ul style="margin: 10px 0;">
                <li>This link will expire in 24 hours</li>
                <li>You must verify your email to access all features</li>
                <li>If you didn't create this account, please ignore this email</li>
              </ul>
            </div>
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>${appName} Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to ${appName}!

      Hello ${recipientName},

      Thank you for registering with ${appName}. To complete your registration, please verify your email address by clicking the link below:

      ${verificationUrl}

      Important:
      - This link will expire in 24 hours
      - You must verify your email to access all features
      - If you didn't create this account, please ignore this email

      If you have any questions, please contact our support team.

      Best regards,
      ${appName} Team

      This is an automated email. Please do not reply to this message.
    `,
  };

  return await sendEmail(mailOptions);
};

/**
 * Email template for task assignment notification
 * @param {string} recipientEmail - Recipient email address
 * @param {string} recipientName - Recipient full name
 * @param {Object} task - Task object with details
 * @param {string} assignedBy - Name of user who assigned the task
 * @param {string} taskUrl - URL to view the task
 * @returns {Promise<Object>} Email send result
 */
export const sendTaskAssignmentEmail = async (
  recipientEmail,
  recipientName,
  task,
  assignedBy,
  taskUrl
) => {
  const appName = process.env.APP_NAME || "Task Manager";
  const fromEmail = process.env.SMTP_USER;

  // Format due date if available
  const dueDateText = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not specified";

  // Priority color mapping
  const priorityColors = {
    LOW: "#4caf50",
    MEDIUM: "#ff9800",
    HIGH: "#f44336",
    URGENT: "#d32f2f",
  };

  const priorityColor = priorityColors[task.priority] || "#757575";

  const mailOptions = {
    from: `"${appName}" <${fromEmail}>`,
    to: recipientEmail,
    subject: `New Task Assigned: ${task.title} - ${appName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #1976d2;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #1976d2;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .task-details {
              background-color: white;
              border: 1px solid #ddd;
              border-radius: 5px;
              padding: 20px;
              margin: 20px 0;
            }
            .task-field {
              margin: 10px 0;
              padding: 10px 0;
              border-bottom: 1px solid #eee;
            }
            .task-field:last-child {
              border-bottom: none;
            }
            .task-field strong {
              display: inline-block;
              width: 120px;
              color: #666;
            }
            .priority-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              color: white;
              font-size: 12px;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${appName}</h1>
          </div>
          <div class="content">
            <h2>🎯 New Task Assigned</h2>
            <p>Hello ${recipientName},</p>
            <p>You have been assigned a new task by <strong>${assignedBy}</strong>.</p>

            <div class="task-details">
              <h3 style="margin-top: 0;">${task.title}</h3>
              <div class="task-field">
                <strong>Priority:</strong>
                <span class="priority-badge" style="background-color: ${priorityColor};">
                  ${task.priority}
                </span>
              </div>
              <div class="task-field">
                <strong>Status:</strong>
                <span>${task.status}</span>
              </div>
              <div class="task-field">
                <strong>Due Date:</strong>
                <span>${dueDateText}</span>
              </div>
              <div class="task-field">
                <strong>Description:</strong>
                <p style="margin: 10px 0 0 0;">${task.description}</p>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${taskUrl}" class="button">View Task Details</a>
            </div>

            <p>Please review the task details and start working on it at your earliest convenience.</p>
            <p>If you have any questions, please contact ${assignedBy} or your team lead.</p>
            <p>Best regards,<br>${appName} Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      New Task Assigned - ${appName}

      Hello ${recipientName},

      You have been assigned a new task by ${assignedBy}.

      Task Details:
      Title: ${task.title}
      Priority: ${task.priority}
      Status: ${task.status}
      Due Date: ${dueDateText}
      Description: ${task.description}

      View task details: ${taskUrl}

      Please review the task details and start working on it at your earliest convenience.

      If you have any questions, please contact ${assignedBy} or your team lead.

      Best regards,
      ${appName} Team

      This is an automated email. Please do not reply to this message.
    `,
  };

  return await sendEmail(mailOptions);
};

/**
 * Email template for welcome email after registration
 * @param {string} recipientEmail - Recipient email address
 * @param {string} recipientName - Recipient full name
 * @param {string} organizationName - Organization name
 * @param {string} loginUrl - URL to login
 * @returns {Promise<Object>} Email send result
 */
export const sendWelcomeEmail = async (
  recipientEmail,
  recipientName,
  organizationName,
  loginUrl
) => {
  const appName = process.env.APP_NAME || "Task Manager";
  const fromEmail = process.env.SMTP_USER;

  const mailOptions = {
    from: `"${appName}" <${fromEmail}>`,
    to: recipientEmail,
    subject: `Welcome to ${appName}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #1976d2;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #1976d2;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .features {
              background-color: white;
              border: 1px solid #ddd;
              border-radius: 5px;
              padding: 20px;
              margin: 20px 0;
            }
            .features ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .features li {
              margin: 8px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Welcome to ${appName}!</h1>
          </div>
          <div class="content">
            <h2>Hello ${recipientName},</h2>
            <p>Welcome to <strong>${organizationName}</strong> on ${appName}!</p>
            <p>Your account has been successfully created. You can now start managing tasks, collaborating with your team, and tracking progress in real-time.</p>

            <div class="features">
              <h3>What you can do:</h3>
              <ul>
                <li>✅ Create and manage tasks</li>
                <li>👥 Collaborate with team members</li>
                <li>📊 Track project progress</li>
                <li>💬 Comment and discuss tasks</li>
                <li>🔔 Receive real-time notifications</li>
                <li>📎 Attach files and documents</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Login to Your Account</a>
            </div>

            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>We're excited to have you on board!</p>
            <p>Best regards,<br>${appName} Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to ${appName}!

      Hello ${recipientName},

      Welcome to ${organizationName} on ${appName}!

      Your account has been successfully created. You can now start managing tasks, collaborating with your team, and tracking progress in real-time.

      What you can do:
      - Create and manage tasks
      - Collaborate with team members
      - Track project progress
      - Comment and discuss tasks
      - Receive real-time notifications
      - Attach files and documents

      Login to your account: ${loginUrl}

      If you have any questions or need assistance, please don't hesitate to contact our support team.

      We're excited to have you on board!

      Best regards,
      ${appName} Team

      This is an automated email. Please do not reply to this message.
    `,
  };

  return await sendEmail(mailOptions);
};

/**
 * Verify email transporter connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export const verifyEmailConnection = async () => {
  try {
    await getTransporter().verify();
    logger.info("Email transporter connection verified successfully");
    return true;
  } catch (error) {
    logger.error("Email transporter connection verification failed", {
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
};

export default {
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendTaskAssignmentEmail,
  sendWelcomeEmail,
  verifyEmailConnection,
};
