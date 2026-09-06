import { z } from 'zod';
import { verifyEmailHygiene, verifyLeadEmail } from '../services/verification/emailVerificationService.js';
import { AppError } from '../utils/AppError.js';

const verifyEmailSchema = z.object({
  email: z.string().min(1, 'Email is required'),
});

export const verifyEmail = async (req, res, next) => {
  try {
    const { email } = verifyEmailSchema.parse(req.body);

    const result = await verifyEmailHygiene(email);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyLeadContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    if (!organizationId) {
      throw new AppError('Organization context missing', 400, 'NO_TENANT_CONTEXT');
    }

    const result = await verifyLeadEmail(id, organizationId);

    res.status(200).json({
      success: true,
      message: `Lead verification completed with status: ${result.verification.status}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
