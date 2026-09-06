import { z } from 'zod';
import { Lead } from '../models/Lead.js';
import { validateStateTransition } from '../services/leadStateMachine.js';
import { transitionLeadState } from '../services/leadStateEngine.js';
import { filterDuplicates } from '../services/discovery/deduplicationEngine.js';
import { AppError } from '../utils/AppError.js';

const createLeadSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  location: z.object({
    country: z.string().default('India'),
    state: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  contact: z
    .object({
      phone: z.string().optional(),
      email: z.string().email('Invalid email').optional().or(z.literal('')),
      whatsapp: z.string().optional(),
      decisionMakerName: z.string().optional(),
      decisionMakerTitle: z.string().optional(),
    })
    .optional(),
  website: z
    .object({
      url: z.string().optional(),
      exists: z.boolean().default(false),
      hasSsl: z.boolean().optional(),
      isMobileFriendly: z.boolean().optional(),
      techStack: z.array(z.string()).default([]),
    })
    .optional(),
  social: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      linkedin: z.string().optional(),
    })
    .optional(),
  businessProfile: z
    .object({
      rating: z.number().min(0).max(5).optional(),
      reviewCount: z.number().optional(),
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  source: z.enum(['GOOGLE_MAPS', 'DIRECTORY', 'CSV_IMPORT', 'CUSTOM_SCRAPER']).default('GOOGLE_MAPS'),
});

const updateLeadSchema = createLeadSchema.partial().extend({
  status: z
    .enum([
      'NEW',
      'DISCOVERED',
      'ENRICHING',
      'VERIFIED',
      'QUALIFIED',
      'REJECTED',
      'CONTACTED',
      'REPLIED',
      'INTERESTED',
      'NOT_INTERESTED',
      'MEETING',
      'PROPOSAL',
      'WON',
      'LOST',
    ])
    .optional(),
});

export const getLeads = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new AppError('Organization context missing.', 400, 'NO_TENANT_CONTEXT');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const { city, category, status, search, minScore, websiteExists } = req.query;

    const query = { organizationId };

    if (city) query['location.city'] = new RegExp(city, 'i');
    if (category) query.category = new RegExp(category, 'i');
    if (status) query.status = status;
    if (minScore) query['aiAnalysis.score'] = { $gte: Number(minScore) };
    if (websiteExists !== undefined) query['website.exists'] = websiteExists === 'true';

    if (search) {
      query.$or = [
        { businessName: new RegExp(search, 'i') },
        { 'contact.email': new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') },
      ];
    }

    const [leads, total] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Lead.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    const lead = await Lead.findOne({ _id: id, organizationId });
    if (!lead) {
      throw new AppError('Lead not found.', 404, 'LEAD_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const createLead = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new AppError('Organization context missing.', 400, 'NO_TENANT_CONTEXT');
    }

    const validatedData = createLeadSchema.parse(req.body);

    const cleanName = validatedData.businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanCity = validatedData.location.city.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPhone = (validatedData.contact?.phone || '').replace(/[^0-9]/g, '');
    const normalizedKey = `${cleanName}_${cleanCity}_${cleanPhone}`;

    const existingLead = await Lead.findOne({ organizationId, normalizedKey });
    if (existingLead) {
      throw new AppError('A lead with matching details already exists in your workspace.', 409, 'DUPLICATE_LEAD');
    }

    const lead = await Lead.create({
      ...validatedData,
      organizationId,
      normalizedKey,
      status: 'NEW',
    });

    res.status(201).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    const lead = await Lead.findOne({ _id: id, organizationId });
    if (!lead) {
      throw new AppError('Lead not found.', 404, 'LEAD_NOT_FOUND');
    }

    const validatedData = updateLeadSchema.parse(req.body);

    if (validatedData.status && validatedData.status !== lead.status) {
      validateStateTransition(lead.status, validatedData.status);
    }

    Object.assign(lead, validatedData);
    await lead.save();

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    const lead = await Lead.findOneAndDelete({ _id: id, organizationId });
    if (!lead) {
      throw new AppError('Lead not found.', 404, 'LEAD_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const changeLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const organizationId = req.organizationId;
    const userId = req.user?.userId;

    if (!status) {
      throw new AppError('New status is required', 400, 'MISSING_STATUS');
    }

    const updatedLead = await transitionLeadState({
      leadId: id,
      organizationId,
      newStatus: status,
      userId,
      metadata: { source: 'API_STATUS_PATCH' },
    });

    res.status(200).json({
      success: true,
      message: `Lead status updated to ${status}`,
      data: updatedLead,
    });
  } catch (error) {
    next(error);
  }
};

export const checkDuplicateLead = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new AppError('Organization context missing.', 400, 'NO_TENANT_CONTEXT');
    }

    const leadPayload = req.body;
    const result = await filterDuplicates(organizationId, [leadPayload]);

    const isDuplicate = result.duplicateLeads.length > 0;
    const matchData = isDuplicate ? result.duplicateLeads[0] : null;

    res.status(200).json({
      success: true,
      data: {
        isDuplicate,
        matchType: matchData ? matchData.matchType : 'UNIQUE',
        reason: matchData ? matchData.reason : 'No matching lead found in workspace',
        similarityScore: matchData?.similarityScore || null,
        matchedWith: matchData?.matchedWith || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
