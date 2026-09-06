import { z } from 'zod';
import { addKnowledgeDocument, getKnowledgeDocuments, getRelevantContext } from '../services/ai/ragService.js';
import { AppError } from '../utils/AppError.js';

const docSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  content: z.string().min(1, 'Content is required'),
  caseStudyResults: z.string().optional(),
  targetCategories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

const querySchema = z.object({
  category: z.string().min(1, 'Category is required'),
  painPoints: z.array(z.string()).default([]),
  topK: z.number().min(1).max(5).default(2),
});

export const createDoc = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new AppError('Organization context missing', 400, 'NO_TENANT_CONTEXT');
    }

    const validated = docSchema.parse(req.body);
    const doc = await addKnowledgeDocument(organizationId, validated);

    res.status(201).json({
      success: true,
      message: 'Knowledge document added successfully',
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocs = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new AppError('Organization context missing', 400, 'NO_TENANT_CONTEXT');
    }

    const docs = await getKnowledgeDocuments(organizationId);

    res.status(200).json({
      success: true,
      data: docs,
    });
  } catch (error) {
    next(error);
  }
};

export const queryContext = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new AppError('Organization context missing', 400, 'NO_TENANT_CONTEXT');
    }

    const { category, painPoints, topK } = querySchema.parse(req.body);
    const context = await getRelevantContext(organizationId, { category, painPoints }, topK);

    res.status(200).json({
      success: true,
      data: context,
    });
  } catch (error) {
    next(error);
  }
};
