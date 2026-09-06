import { EmailAccount } from '../models/EmailAccount.js';
import { verifySmtpConnection, verifyDomainSecurityRecords } from '../services/email/smtpService.js';
import { calculateWarmupCap } from '../services/email/inboxRotator.js';

export const getEmailAccounts = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const accounts = await EmailAccount.find({ organizationId }).sort({ createdAt: -1 });

    const formattedAccounts = accounts.map((acc) => {
      const doc = acc.toObject();
      const warmupCap = calculateWarmupCap(acc.createdAt);
      return {
        ...doc,
        effectiveDailyCap: acc.isWarmupActive ? Math.min(acc.dailySendLimit, warmupCap) : acc.dailySendLimit,
        warmupCap
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedAccounts.length,
      data: formattedAccounts
    });
  } catch (error) {
    next(error);
  }
};

export const createEmailAccount = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const { senderName, email, smtpHost, smtpPort, smtpUser, smtpPassEncrypted, dailySendLimit, isWarmupActive } = req.body;

    if (!senderName || !email || !smtpHost || !smtpUser || !smtpPassEncrypted) {
      return res.status(400).json({
        success: false,
        error: 'Missing required SMTP parameters: senderName, email, smtpHost, smtpUser, smtpPassEncrypted'
      });
    }

    const emailAccount = await EmailAccount.create({
      organizationId,
      senderName,
      email: email.toLowerCase(),
      smtpHost,
      smtpPort: smtpPort || 587,
      smtpUser,
      smtpPassEncrypted,
      dailySendLimit: dailySendLimit || 40,
      isWarmupActive: isWarmupActive !== undefined ? isWarmupActive : true,
      status: 'ACTIVE'
    });

    return res.status(201).json({
      success: true,
      message: 'Email account registered successfully',
      data: emailAccount
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmailAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const emailAccount = await EmailAccount.findOne({ _id: id, organizationId });
    if (!emailAccount) {
      return res.status(404).json({ success: false, error: 'Email account not found' });
    }

    const allowedUpdates = ['senderName', 'dailySendLimit', 'isWarmupActive', 'status', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpPassEncrypted'];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        emailAccount[field] = req.body[field];
      }
    });

    await emailAccount.save();

    return res.status(200).json({
      success: true,
      message: 'Email account updated successfully',
      data: emailAccount
    });
  } catch (error) {
    next(error);
  }
};

export const testEmailAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const emailAccount = await EmailAccount.findOne({ _id: id, organizationId });
    if (!emailAccount) {
      return res.status(404).json({ success: false, error: 'Email account not found' });
    }

    const verificationResult = await verifySmtpConnection(emailAccount);

    if (verificationResult.success) {
      emailAccount.status = 'ACTIVE';
      emailAccount.healthScore = Math.min(100, emailAccount.healthScore + 10);
      await emailAccount.save();
    } else {
      emailAccount.status = 'AUTH_ERROR';
      await emailAccount.save();
    }

    return res.status(200).json({
      success: verificationResult.success,
      data: verificationResult
    });
  } catch (error) {
    next(error);
  }
};

export const checkDomainSecurity = async (req, res, next) => {
  try {
    const { domain } = req.query;
    if (!domain) {
      return res.status(400).json({ success: false, error: 'Domain query parameter is required (e.g. ?domain=acme.com)' });
    }

    const securityResults = await verifyDomainSecurityRecords(domain);

    return res.status(200).json({
      success: true,
      data: securityResults
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmailAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const deleted = await EmailAccount.findOneAndDelete({ _id: id, organizationId });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Email account not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Email account removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
