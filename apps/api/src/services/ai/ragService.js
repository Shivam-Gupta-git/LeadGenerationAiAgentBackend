import { KnowledgeDoc } from '../../models/KnowledgeDoc.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Add or update an agency knowledge asset
 */
export const addKnowledgeDocument = async (organizationId, docData) => {
  if (!organizationId) {
    throw new AppError('Organization ID is required', 400, 'NO_TENANT_CONTEXT');
  }

  const doc = await KnowledgeDoc.create({
    ...docData,
    organizationId,
  });

  return doc;
};

/**
 * List agency knowledge assets for an organization
 */
export const getKnowledgeDocuments = async (organizationId) => {
  return KnowledgeDoc.find({ organizationId, isActive: true }).sort({ createdAt: -1 });
};

/**
 * Contextual RAG retriever: Find relevant case studies and service offerings for a given lead
 * @param {string} organizationId
 * @param {Object} leadContext
 * @param {string} leadContext.category
 * @param {Array<string>} [leadContext.painPoints]
 * @param {number} [topK=2]
 * @returns {Promise<Array<Object>>} Top matching knowledge documents
 */
export const getRelevantContext = async (organizationId, leadContext, topK = 2) => {
  const { category, painPoints = [] } = leadContext;

  const docs = await KnowledgeDoc.find({ organizationId, isActive: true });
  if (docs.length === 0) {
    return [];
  }

  const cleanCategory = (category || '').toLowerCase();
  const painText = painPoints.join(' ').toLowerCase();

  // Score each document by relevance
  const scoredDocs = docs.map((doc) => {
    let score = 0;

    // 1. Direct Category Match
    if (doc.category.toLowerCase().includes(cleanCategory) || cleanCategory.includes(doc.category.toLowerCase())) {
      score += 40;
    }

    // 2. Target Categories Match
    if (doc.targetCategories && doc.targetCategories.some((tc) => tc.toLowerCase().includes(cleanCategory))) {
      score += 30;
    }

    // 3. Pain Points Content Match
    for (const point of painPoints) {
      if (doc.content.toLowerCase().includes(point.toLowerCase())) {
        score += 15;
      }
    }

    // 4. Tags Match
    if (doc.tags && doc.tags.some((tag) => painText.includes(tag.toLowerCase()))) {
      score += 10;
    }

    return { doc, score };
  });

  // Sort by score descending and return top K
  scoredDocs.sort((a, b) => b.score - a.score);

  return scoredDocs.slice(0, topK).map((item) => ({
    id: item.doc._id,
    title: item.doc.title,
    category: item.doc.category,
    content: item.doc.content,
    caseStudyResults: item.doc.caseStudyResults,
    relevanceScore: item.score,
  }));
};
