import dns from 'dns';
import { isDisposableDomain } from './disposableDomains.js';
import { Lead } from '../../models/Lead.js';
import { AppError } from '../../utils/AppError.js';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validate email RFC syntax
 */
export const verifySyntax = (email) => {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Perform live DNS MX record lookup
 * @param {string} domain
 * @returns {Promise<Array<Object>>} List of MX records or empty array
 */
export const checkMxRecords = async (domain) => {
  if (!domain) return [];
  try {
    const records = await dns.promises.resolveMx(domain);
    return records && records.length > 0 ? records.sort((a, b) => a.priority - b.priority) : [];
  } catch (err) {
    return [];
  }
};

/**
 * Full Email Hygiene Verification Pipeline
 * @param {string} email
 * @returns {Promise<Object>} Verification details & status
 */
export const verifyEmailHygiene = async (email) => {
  if (!email) {
    return {
      email,
      status: 'INVALID',
      reason: 'Email is missing or null',
      isDisposable: false,
      hasMx: false,
      mxRecords: [],
    };
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Syntax Check
  if (!verifySyntax(cleanEmail)) {
    return {
      email: cleanEmail,
      status: 'INVALID',
      reason: 'Invalid email syntax format',
      isDisposable: false,
      hasMx: false,
      mxRecords: [],
    };
  }

  const domain = cleanEmail.split('@')[1];

  // 2. Disposable Domain Filter
  if (isDisposableDomain(domain)) {
    return {
      email: cleanEmail,
      status: 'RISKY',
      reason: 'Temporary / Disposable email provider',
      isDisposable: true,
      hasMx: false,
      mxRecords: [],
    };
  }

  // 3. DNS MX Record Lookup
  const mxRecords = await checkMxRecords(domain);
  const hasMx = mxRecords.length > 0;

  if (!hasMx) {
    return {
      email: cleanEmail,
      status: 'INVALID',
      reason: `No active mail exchanger (MX) records found for domain '${domain}'`,
      isDisposable: false,
      hasMx: false,
      mxRecords: [],
    };
  }

  // 4. Role-based email check (info@, admin@, sales@ are valid but RISKY)
  const username = cleanEmail.split('@')[0];
  const roleAccounts = ['info', 'admin', 'sales', 'support', 'contact', 'office', 'help'];
  const isRoleAccount = roleAccounts.includes(username);

  return {
    email: cleanEmail,
    status: isRoleAccount ? 'RISKY' : 'VALID',
    reason: isRoleAccount ? 'Role-based address (e.g. info@, admin@)' : 'Valid format & active MX records found',
    isDisposable: false,
    hasMx: true,
    mxRecords: mxRecords.map((r) => r.exchange),
  };
};

/**
 * Verify a lead's email and update database status
 */
export const verifyLeadEmail = async (leadId, organizationId) => {
  const lead = await Lead.findOne({ _id: leadId, organizationId });
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  const email = lead.contact?.email;
  if (!email) {
    lead.contact.verificationStatus = 'INVALID';
    lead.contact.isEmailVerified = false;
    await lead.save();
    return { lead, verification: { status: 'INVALID', reason: 'No email present on lead' } };
  }

  const verification = await verifyEmailHygiene(email);

  lead.contact.verificationStatus = verification.status;
  lead.contact.isEmailVerified = verification.status === 'VALID';
  
  if (lead.status === 'ENRICHING' || lead.status === 'DISCOVERED') {
    lead.status = verification.status === 'INVALID' ? 'REJECTED' : 'VERIFIED';
  }

  await lead.save();

  return { lead, verification };
};
