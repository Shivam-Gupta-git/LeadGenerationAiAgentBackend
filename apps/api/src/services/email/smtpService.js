import nodemailer from 'nodemailer';
import dns from 'dns/promises';
import { EmailAccount } from '../../models/EmailAccount.js';

/**
 * Create a Nodemailer transporter from an EmailAccount model instance.
 */
export const createTransporter = (emailAccount) => {
  const isSecure = emailAccount.smtpPort === 465;
  return nodemailer.createTransport({
    host: emailAccount.smtpHost,
    port: emailAccount.smtpPort,
    secure: isSecure,
    auth: {
      user: emailAccount.smtpUser,
      pass: emailAccount.smtpPassEncrypted, // Expects plain or decrypted password string
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed or relaxed TLS for dev/test servers
    },
    connectionTimeout: 10000
  });
};

/**
 * Verify SMTP connection and credentials.
 */
export const verifySmtpConnection = async (emailAccount) => {
  try {
    const transporter = createTransporter(emailAccount);
    await transporter.verify();
    return { success: true, message: 'SMTP connection verified successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * Send an email via the selected EmailAccount.
 */
export const sendEmail = async (emailAccount, { to, subject, html, text, replyTo, headers = {} }) => {
  try {
    const transporter = createTransporter(emailAccount);

    const mailOptions = {
      from: `"${emailAccount.senderName}" <${emailAccount.email}>`,
      to,
      subject,
      html,
      text,
      replyTo: replyTo || emailAccount.email,
      headers: {
        'X-Mailer': 'AI-Lead-Gen-Agent/1.0',
        ...headers
      }
    };

    const info = await transporter.sendMail(mailOptions);

    // Update sent count today
    await EmailAccount.findByIdAndUpdate(emailAccount._id, {
      $inc: { currentSentToday: 1 }
    });

    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    };
  } catch (error) {
    // If SMTP authentication fails, mark status as AUTH_ERROR
    if (error.message.includes('Invalid login') || error.message.includes('EAUTH')) {
      await EmailAccount.findByIdAndUpdate(emailAccount._id, {
        status: 'AUTH_ERROR',
        healthScore: Math.max(0, emailAccount.healthScore - 25)
      });
    }

    throw new Error(`Email dispatch failed via ${emailAccount.email}: ${error.message}`);
  }
};

/**
 * DNS SPF & DKIM record verification helper.
 */
export const verifyDomainSecurityRecords = async (domain) => {
  const results = { domain, hasSpf: false, spfRecord: null, hasDkim: false, errors: [] };

  try {
    const txtRecords = await dns.resolveTxt(domain);
    const flatTxt = txtRecords.flat();

    const spf = flatTxt.find(rec => rec.startsWith('v=spf1'));
    if (spf) {
      results.hasSpf = true;
      results.spfRecord = spf;
    }

    // Check default DKIM selector (google._domainkey, dkim._domainkey, selector1._domainkey)
    const selectors = ['default', 'google', 'k1', 's1', 's2021'];
    for (const selector of selectors) {
      try {
        const dkimTxt = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
        if (dkimTxt && dkimTxt.length > 0) {
          results.hasDkim = true;
          break;
        }
      } catch (err) {
        // Selector not found, continue checking
      }
    }
  } catch (err) {
    results.errors.push(`DNS lookup failed for ${domain}: ${err.message}`);
  }

  return results;
};

export default {
  createTransporter,
  verifySmtpConnection,
  sendEmail,
  verifyDomainSecurityRecords
};
