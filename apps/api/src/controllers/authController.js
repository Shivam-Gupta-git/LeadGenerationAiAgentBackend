import { z } from 'zod';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

const registerSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  name: z.string().min(2, 'User name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const register = async (req, res, next) => {
  try {
    const { organizationName, name, email, password } = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email address is already registered.', 400, 'EMAIL_EXISTS');
    }

    const slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
    const organization = await Organization.create({
      name: organizationName,
      slug,
      plan: 'FREE',
    });

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      organizationId: organization._id,
      name,
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
    });

    const tokenPayload = {
      userId: user._id.toString(),
      organizationId: organization._id.toString(),
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          plan: organization.plan,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const organization = await Organization.findById(user.organizationId);

    const tokenPayload = {
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        organization: organization
          ? {
              id: organization._id,
              name: organization.name,
              slug: organization.slug,
              plan: organization.plan,
            }
          : null,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated.', 401, 'UNAUTHORIZED');
    }

    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const organization = await Organization.findById(user.organizationId);

    res.status(200).json({
      success: true,
      data: {
        user,
        organization,
      },
    });
  } catch (error) {
    next(error);
  }
};
